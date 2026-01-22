import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Define the structure of our final response
type Permissions = {
    GET: 'Allowed' | 'Forbidden' | 'Not Testable';
    POST: 'Allowed' | 'Forbidden' | 'Not Testable';
};

type ScanResult = {
    supabaseUrl?: string;
    anonKey?: string;
    isLovable: boolean;
    publicData?: Record<string, { permissions: Permissions; data: unknown[] | { error: string } }>;
    discoveredPaths?: string[];
    error?: string;
};

const rateLimiter = new RateLimiterMemory({
    points: 5, // 5 requests
    duration: 60, // per 60 seconds
});

const AXIOS_TIMEOUT = 10000; // 10 seconds

export async function POST(request: Request) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';

    try {
        await rateLimiter.consume(ip);
    } catch {
        return NextResponse.json({ isLovable: false, error: 'Too many requests. Please wait a minute before trying again.' }, { status: 429 });
    }

    const { targetUrl, customJwtKey } = await request.json();

    if (!targetUrl || typeof targetUrl !== 'string') {
        return NextResponse.json({ isLovable: false, error: 'A valid URL is required.' }, { status: 400 });
    }

    if (customJwtKey && typeof customJwtKey !== 'string') {
        return NextResponse.json({ isLovable: false, error: 'Custom JWT key must be a string.' }, { status: 400 });
    }

    try {
        // --- Phase 1: Asset Scan ---
        const headers = { 'User-Agent': 'SupabaseSiteScanner/1.0' };
        const response = await axios.get(targetUrl, { headers, timeout: AXIOS_TIMEOUT });
        const $ = cheerio.load(response.data);

        let allJsCode = '';
        const scriptPromises: Promise<void>[] = [];

        $('script').each((i, el) => {
            const src = $(el).attr('src');
            if (src) {
                try {
                    const scriptUrl = new URL(src, targetUrl).href;
                    scriptPromises.push(
                        axios.get(scriptUrl, { headers, timeout: AXIOS_TIMEOUT }).then(asset => {
                            allJsCode += asset.data + '\n';
                        }).catch(err => console.error(`Failed to fetch script ${scriptUrl}: ${err.message}`))
                    );
                } catch {
                    console.error(`Invalid script URL found: ${src}`);
                }
            } else {
                allJsCode += $(el).html() + '\n';
            }
        });
        
        await Promise.all(scriptPromises);

        // --- Path Discovery ---
        const pathRegex = /path:\s*"([^"]+)"/g;
        const discoveredPaths = new Set<string>();
        let match;
        while ((match = pathRegex.exec(allJsCode)) !== null) {
            discoveredPaths.add(match[1]);
        }
        const uniquePaths = Array.from(discoveredPaths);

        // --- Supabase Credential Discovery ---
        const urlRegex = /https?:\/\/[a-zA-Z0-9-]+\.supabase\.co/g;
        const keyRegex = /eyJ[a-zA-Z0-9._-]+/g;

        const supabaseUrl = allJsCode.match(urlRegex)?.[0];
        const anonKey = allJsCode.match(keyRegex)?.[0];

        if (!supabaseUrl || !anonKey) {
            const message = "Scan complete. No public Supabase credentials were found.";
            return NextResponse.json({ 
                isLovable: false, 
                error: uniquePaths.length > 0 ? message : `${message} No client-side paths were found either.`,
                discoveredPaths: uniquePaths 
            }, { status: 200 });
        }

        // --- Phase 2: Data Extraction & Permission Checks ---
        const restUrl = `${supabaseUrl}/rest/v1`;
        const authToken = customJwtKey || anonKey;
        const baseHeaders = { apikey: anonKey, Authorization: `Bearer ${authToken}` };

        const schemaResponse = await axios.get(`${restUrl}/`, { headers: baseHeaders, timeout: AXIOS_TIMEOUT });
        const schema = schemaResponse.data;
        const paths = Object.keys(schema.paths);

        const publicData: ScanResult['publicData'] = {};

        for (const path of paths) {
            if (path === '/' || schema.paths[path]?.get?.tags?.includes('(rpc)')) continue;

            const permissions: Permissions = {
                GET: 'Not Testable',
                POST: 'Not Testable',
            };
            let tableData: unknown[] | { error: string } = { error: 'No data fetched' };

            // --- GET Check ---
            try {
                const { data } = await axios.get(`${restUrl}${path}`, { headers: baseHeaders, timeout: AXIOS_TIMEOUT });
                permissions.GET = 'Allowed';
                tableData = data;
            } catch {
                permissions.GET = 'Forbidden';
                tableData = { error: 'Access denied or failed to fetch.' };
            }

            const pathMethods = schema.paths[path];

            // --- POST Check ---
            if (pathMethods?.post) {
                try {
                    await axios.post(`${restUrl}${path}`, {}, {
                        headers: { ...baseHeaders, 'Content-Type': 'application/json', 'Prefer': 'tx=rollback' },
                        timeout: AXIOS_TIMEOUT,
                    });
                    permissions.POST = 'Allowed';
                } catch (error: unknown) {
                    if (axios.isAxiosError(error) && error.response?.status === 400) {
                        permissions.POST = 'Allowed'; // Likely a data validation error, which means RLS didn't block it.
                    } else {
                        permissions.POST = 'Forbidden';
                    }
                }
            }

            

            publicData[path] = { permissions, data: tableData };
        }

        return NextResponse.json({
            isLovable: true,
            supabaseUrl,
            anonKey,
            publicData,
            discoveredPaths: uniquePaths,
        }, { status: 200 });

    } catch (error: unknown) {
        console.error(error);
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED') {
                return NextResponse.json({ isLovable: false, error: `Could not reach the site. The request timed out after ${AXIOS_TIMEOUT / 1000} seconds.` }, { status: 408 });
            }
            console.error(`Could not reach the site: ${error.message}`);
            console.error(`Response status: ${error.response?.status}, data: ${error.response?.data}`);
            return NextResponse.json({ isLovable: false, error: `Could not reach the site: ${error.message}` }, { status: 500 });
        }
        return NextResponse.json({ isLovable: false, error: 'An unexpected error occurred during the scan.' }, { status: 500 });
    }
}