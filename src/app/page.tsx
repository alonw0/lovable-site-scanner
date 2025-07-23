'use client';

import { useState, FormEvent, useMemo, useEffect } from 'react';

// Define the result type to match the API response
type ScanResult = {
    supabaseUrl?: string;
    anonKey?: string;
    isLovable: boolean;
    publicData?: Record<string, unknown[] | { error: string }>;
    error?: string;
};

// --- Regex for sensitive data ---
const PII_PATTERNS = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /\b(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})\b/g,
    creditCard: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b/g,
    password: /password|pass|pwd/i, // Simple check for password-like fields
};

// --- Analysis Component ---
const AnalysisSummary = ({ publicData, onPiiDetected }: { publicData: ScanResult['publicData'], onPiiDetected: (hasPii: boolean) => void }) => {
    const foundTypes = useMemo(() => {
        const piiTypes = new Set<string>();
        if (!publicData) return [];

        const dataString = JSON.stringify(publicData);

        for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
            const regex = new RegExp(pattern.source, pattern.flags);
            if (regex.test(dataString)) {
                piiTypes.add(type);
            }
        }
        return Array.from(piiTypes);
    }, [publicData]);

    useEffect(() => {
        onPiiDetected(foundTypes.length > 0);
    }, [foundTypes, onPiiDetected]);

    if (foundTypes.length === 0) {
        return (
            <div className="mt-4 p-4 border border-green-500 bg-green-100 rounded-md">
                <h3 className="text-lg font-bold text-green-900">Analysis Summary</h3>
                <p className="text-green-800">✅ No obvious sensitive information (emails, phone numbers, etc.) was found in the public data.</p>
            </div>
        );
    }

    const typeToEmoji: Record<string, string> = {
        email: '📧',
        phone: '📞',
        creditCard: '💳',
        password: '🔑',
    };

    return (
        <div className="mt-4 p-4 border border-red-500 bg-red-100 rounded-md">
            <h3 className="text-lg font-bold text-red-900">⚠️ Analysis Summary: Potential PII Found!</h3>
            <p className="text-red-800">The scan detected the following types of potentially sensitive data. Review the tables below carefully.</p>
            <p className="text-xs text-red-700 mt-1">(Disclaimer: This check is based on regular expressions and may not be 100% accurate. Please verify the findings.)</p>
            <div className="flex flex-wrap gap-4 mt-2">
                {foundTypes.map(type => (
                    <div key={type} className="flex items-center gap-2 p-2 bg-red-200 rounded-md">
                        <span className="text-2xl">{typeToEmoji[type] || '❓'}</span>
                        <span className="font-semibold text-red-900">{type.charAt(0).toUpperCase() + type.slice(1)}s</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


const CollapsibleData = ({ title, data }: { title: string; data: unknown[] | { error: string } }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="mt-2 border border-gray-300 rounded-md">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-2 text-left bg-gray-800 hover:bg-gray-600 flex justify-between items-center rounded-md"
            >
                <h4 className="font-semibold">{title}</h4>
                <span>{isOpen ? '▼' : '▶'}</span>
            </button>
            {isOpen && (
                <div className="p-2">
                    <pre className="overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};


export default function Home() {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasPii, setHasPii] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setResult(null);
        setError(null);

        try {
            const response = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUrl: url }),
            });

            const data: ScanResult = await response.json();

            if (!response.ok || data.error) {
                setError(data.error || 'An unknown error occurred.');
            } else {
                setResult(data);
            }
        } catch (err: unknown) {
            setError('Failed to connect to the scanning service.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
                <h1 className="text-4xl font-bold text-center">Lovable Site Scanner</h1>
                <p className="text-center">
                    Check your Supabase-powered sites for public data leaks.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col items-center w-full">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://www.example.com"
                        required
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                    <div className="flex items-center mt-2">
                        <input
                            type="checkbox"
                            id="permission-checkbox"
                            checked={hasPermission}
                            onChange={(e) => setHasPermission(e.target.checked)}
                            className="mr-2"
                        />
                        <label htmlFor="permission-checkbox" className="text-sm">I have permission to scan this site</label>
                    </div>
                    <button type="submit" disabled={isLoading || !hasPermission} className="w-full p-2 mt-2 bg-blue-500 text-white rounded-md disabled:bg-gray-400 flex justify-center items-center">
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Scan Site'}
                    </button>
                </form>

                {error && <p className="text-red-500">{error}</p>}
                
                {result && (
                    <div className="w-full mt-4">
                        <h2 className="text-2xl font-bold">Scan Results</h2>
                        {result.isLovable ? (
                            <>
                                <p><strong>✅ This site is lovable! (or supabase powered)</strong></p>
                                <p><strong>Supabase URL:</strong> {result.supabaseUrl}</p>
                                <p><strong>Anon Key:</strong> <code className="break-all">{result.anonKey}</code></p>
                                
                                <AnalysisSummary publicData={result.publicData} onPiiDetected={setHasPii} />

                                {hasPii && (
                                    <div className="mt-4 p-4 border border-blue-500 bg-blue-100 rounded-md">
                                        <p className="text-blue-600">For more info, you can refer to: <a className="underline text-red-500" href="https://docs.lovable.dev/features/security">Lovable docs</a></p>
                                        <p className="text-blue-600">Or try this prompt (credit <i>goodtimesKC</i> from r/lovable) - <a className="underline text-red-500" href="https://www.reddit.com/r/lovable/comments/1lmkfhf/comment/n083sqr/">link</a></p>
                                        <br />
                                        <p className="text-blue-800">Still need help fixing those issues in your site or app? Contact us at <a href="mailto:contact@drorsoft.com" className="text-blue-600 hover:underline">contact@drorsoft.com</a> or visit <a href="https://www.drorsoft.com" className="text-blue-600 hover:underline">drorsoft.com</a></p>
                                    </div>
                                )}

                                                                <h3 className="mt-4">Public Data Found:</h3>
                                {result.publicData && Object.entries(result.publicData).map(([path, data]) => (
                                    <CollapsibleData key={path} title={path} data={data} />
                                ))}
                                <h5>We only check GET. If you&apos;re worried, check your POST, PUT and PATCH.</h5>
                            </>
                        ) : (
                            <p><strong>❌ This site is not lovable or credentials were not found.</strong></p>
                        )}
                    </div>
                )}
            </div>
        <footer className="w-full mt-8 text-center text-gray-500 text-sm">
                <p>This tool should only be used for educational purposes and on sites where you have permission to scan. Be responsible and respect the privacy of others.</p>
                <br />
                <br />
                <p className="text-xs">Created by <a className="text-red-500 hover:underline" href="https://www.linkedin.com/in/alonwo/">Alon Wolenitz</a></p>
                <p className="text-xs">Powered by <a className="text-blue-600 hover:underline" href="https://www.drorsoft.com">Drorsoft</a></p>
            </footer>
        </main>
    );
}