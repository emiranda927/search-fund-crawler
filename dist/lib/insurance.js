import { INSURANCE_TERMS } from './constants.js';
function cleanText(text) {
    return text
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, ' ')
        .toLowerCase()
        .trim();
}
export function analyzeInsurance(text) {
    const cleaned = cleanText(text);
    const matches = [];
    let totalMatches = 0;
    // Helper function to get proximity score between terms
    function getProximityScore(text, term1, term2) {
        const words = text.split(/\s+/);
        const positions1 = [];
        const positions2 = [];
        words.forEach((word, index) => {
            if (word.includes(term1.toLowerCase()))
                positions1.push(index);
            if (word.includes(term2.toLowerCase()))
                positions2.push(index);
        });
        if (positions1.length === 0 || positions2.length === 0)
            return 0;
        // Find minimum distance between any two positions
        let minDistance = Infinity;
        for (const pos1 of positions1) {
            for (const pos2 of positions2) {
                minDistance = Math.min(minDistance, Math.abs(pos1 - pos2));
            }
        }
        return Math.max(0, 1 - minDistance / 50); // Higher score for closer terms
    }
    // Check for insurance statements with more flexible matching
    for (const term of INSURANCE_TERMS.statements) {
        const lowerTerm = term.toLowerCase();
        // More flexible regex that allows for some variation
        const regex = new RegExp(`\\b${lowerTerm.split(' ').join('[\\s-]*')}\\b|` +
            `\\b${lowerTerm.replace('insurance', '(insurance|coverage)')}\\b`, 'gi');
        const frequency = (cleaned.match(regex) || []).length;
        if (frequency > 0) {
            const contextRegex = new RegExp(`.{0,100}(${regex.source}).{0,100}`, 'gi');
            const contexts = cleaned.match(contextRegex) || [];
            if (contexts.length > 0) {
                matches.push({
                    term,
                    frequency,
                    context: contexts
                        .slice(0, 3)
                        .map(ctx => ctx.trim())
                        .join(' [...] '),
                    type: 'statement'
                });
                totalMatches += frequency * 2;
            }
        }
    }
    // Check for provider names with proximity analysis
    const providerMatches = [];
    for (const term of INSURANCE_TERMS.providers) {
        const lowerTerm = term.toLowerCase();
        const regex = new RegExp(`\\b${lowerTerm}\\b`, 'gi');
        const frequency = (cleaned.match(regex) || []).length;
        if (frequency > 0) {
            const contextRegex = new RegExp(`.{0,100}\\b${lowerTerm}\\b.{0,100}`, 'gi');
            const contexts = cleaned.match(contextRegex) || [];
            if (contexts.length > 0) {
                // Check proximity to insurance-related terms
                const proximityToInsurance = getProximityScore(cleaned, lowerTerm, 'insurance');
                const proximityToCoverage = getProximityScore(cleaned, lowerTerm, 'coverage');
                const proximityScore = Math.max(proximityToInsurance, proximityToCoverage);
                providerMatches.push({
                    term,
                    frequency,
                    context: contexts
                        .slice(0, 3)
                        .map(ctx => ctx.trim())
                        .join(' [...] '),
                    type: 'provider',
                    proximityScore
                });
                totalMatches += frequency * proximityScore;
            }
        }
    }
    matches.push(...providerMatches);
    // More nuanced acceptance determination
    const hasStatements = matches.some(m => m.type === 'statement');
    const hasProvidersNearInsurance = providerMatches.some(m => (m.proximityScore ?? 0) > 0.5);
    const hasMultipleProviders = providerMatches.length >= 2;
    // Calculate confidence score
    const confidence = Math.min(totalMatches / 8, 1);
    return {
        acceptsInsurance: hasStatements || (hasProvidersNearInsurance && hasMultipleProviders),
        confidence,
        matches
    };
}
