const GROUNDING_MARKER = /^#{1,4}\s+Grounding\b|^\*\*Grounding:?\*\*|^Grounding\s*:/im;
const SECTION_BOUNDARY = /^#{1,4}\s+\S|^\*\*[A-Z][^*]{1,80}:?\*\*\s*$|^[A-Z][\w /-]{1,80}\s*:\s*$/im;

function stripGroundingSection(text: string): string {
    const marker = text.match(GROUNDING_MARKER);
    if (!marker || marker.index === undefined) return text;

    const before = text.slice(0, marker.index);
    const tail = text.slice(marker.index);
    const afterMarker = tail.slice(marker[0].length);
    const boundary = afterMarker.search(SECTION_BOUNDARY);
    if (boundary >= 0) return before + tail.slice(marker[0].length + boundary);

    if (marker[0].startsWith('#')) return before;

    const blankLine = afterMarker.search(/\n\s*\n/);
    if (blankLine >= 0) return before + afterMarker.slice(blankLine);
    return before;
}

function isExplicitlyNonFactual(line: string): boolean {
    return /\b(?:target|proposed|proposal|hypothesis|hypothesize|assumption|assumed|illustrative|example|to verify|needs verification|open question|planned|candidate|recommended|should|will|must be implemented|must implement)\b/i.test(line);
}

function hasLineLevelEvidence(line: string): boolean {
    return /(?:\bfile_read\b|\bbash\b|\bweb_fetch\b|\bweb_search\b|https?:\/\/|\/workspace\/|\boutput\/|\bagents\/|\bprojects\/|\bsrc\/|\blib\/|\bapp\/|\bSELECT\b|\bDB row\b|\[[^\]]+\]|\((?:source|evidence|ref)\s*:)/i.test(line);
}

function isHighRiskFactualLine(line: string): boolean {
    return /(?:\b\d+(?:\.\d+)?\s?%\b|\$\s?\d|\b\d+x\b|\b\d+\s*(?:ms|s|seconds|minutes|hours|days|rps|qps|requests per second)\b|\b(?:verified|observed|achieved|completed|implemented|approved|documented|resolved|delivered|reduced|increased|improved|validated)\b|\b(?:GDPR|CCPA|SOC\s?2|ISO\s?27001|HIPAA|compliant|compliance|encryption|encrypted|anonymization|security)\b|(?:^|\s)(?:src|lib|app|server|config|models|routes|database|platform)\/[\w./-]+|\b[a-zA-Z_$][\w$]+\(\))/i.test(line);
}

export function unsupportedHighRiskClaimLines(text: string): string[] {
    return stripGroundingSection(text)
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(line => !/^#{1,6}\s+\S/.test(line))
        .filter(line => !/^[-*_]{3,}$/.test(line))
        .filter(line => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line))
        .filter(line => isHighRiskFactualLine(line))
        .filter(line => !isExplicitlyNonFactual(line))
        .filter(line => !hasLineLevelEvidence(line));
}
