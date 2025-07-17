

import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Define the structure of our final response
type ScanResult = {
    supabaseUrl?: string;
    anonKey?: string;
    isLovable: boolean;
    publicData?: Record<string, any[] | { error: string }>;
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
    } catch (error) {
        return NextResponse.json({ isLovable: false, error: 'Too many requests. Please wait a minute before trying again.' }, { status: 429 });
    }

    const { targetUrl } = await request.json();

    if (!targetUrl || typeof targetUrl !== 'string') {
        return NextResponse.json({ isLovable: false, error: 'A valid URL is required.' }, { status: 400 });
    }

    try {
        // --- Phase 1: Asset Scan ---
        const headers = { 'User-Agent': 'LovableSiteScanner/1.0' };
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
                } catch (e) {
                    console.error(`Invalid script URL found: ${src}`);
                }
            } else {
                allJsCode += $(el).html() + '\n';
            }
        });
        
        await Promise.all(scriptPromises);

        const urlRegex = /https?:\/\/[a-zA-Z0-9-]+\.supabase\.co/g;
        const keyRegex = /eyJ[a-zA-Z0-9._-]+/g;

        const supabaseUrl = allJsCode.match(urlRegex)?.[0];
        const anonKey = allJsCode.match(keyRegex)?.[0];

        if (!supabaseUrl || !anonKey) {
            return NextResponse.json({ isLovable: false, error: "Scan complete. No public Supabase credentials were found." }, { status: 200 });
        }

        // --- Phase 2: Data Extraction ---
        const restUrl = `${supabaseUrl}/rest/v1`;
        const apiHeaders = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

        const schemaResponse = await axios.get(`${restUrl}/`, { headers: apiHeaders, timeout: AXIOS_TIMEOUT });
        const schema = schemaResponse.data;
        const paths = Object.keys(schema.paths);

        const publicData: ScanResult['publicData'] = {};
        for (const path of paths) {
            if (path === '/' || schema.paths[path]?.get?.tags?.includes('(rpc)')) continue;
            
            try {
                const dataResponse = await axios.get(`${restUrl}${path}`, { headers: apiHeaders, timeout: AXIOS_TIMEOUT });
                publicData[path] = dataResponse.data;
            } catch (error: any) {
                 publicData[path] = { error: `Access denied or failed to fetch. Status: ${error.response?.status || 'N/A'}` };
            }
        }

        return NextResponse.json({
            isLovable: true,
            supabaseUrl,
            anonKey,
            publicData,
        }, { status: 200 });

    } catch (error: any) {
        console.error(error);
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED') {
                return NextResponse.json({ isLovable: false, error: `Could not reach the site. The request timed out after ${AXIOS_TIMEOUT / 1000} seconds.` }, { status: 408 });
            }
            return NextResponse.json({ isLovable: false, error: `Could not reach the site: ${error.message}` }, { status: 500 });
        }
        return NextResponse.json({ isLovable: false, error: 'An unexpected error occurred during the scan.' }, { status: 500 });
    }
}