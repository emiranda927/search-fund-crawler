import { z } from 'zod';
export const UrlSchema = z.string().url().refine((url) => {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    }
    catch {
        return false;
    }
}, { message: 'Invalid URL protocol. Only HTTP and HTTPS are supported.' });
export const KeywordSchema = z.string().min(1).max(100).refine((keyword) => !/[<>]/.test(keyword), { message: 'Keywords cannot contain HTML tags' });
export const AnalysisOptionsSchema = z.object({
    urls: z.array(UrlSchema).min(1).max(1000),
    keywords: z.array(KeywordSchema).min(1).max(50),
    checkInsurance: z.boolean().optional(),
    maxDepth: z.number().int().min(0).max(5).optional(),
    sameDomainOnly: z.boolean().optional()
});
export function sanitizeHtml(html) {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/on\w+="[^"]*"/g, '')
        .replace(/javascript:[^"']*/g, '');
}
