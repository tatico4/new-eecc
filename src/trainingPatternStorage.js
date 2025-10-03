class PatternStorage {
    constructor() {
        console.log('PatternStorage loaded');
    }

    savePattern(pattern) {
        console.log('Pattern saved:', pattern);
    }

    loadPatterns() {
        return [];
    }
}
