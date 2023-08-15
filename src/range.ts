class Range {
    private start: number
    private end: number
    private step: number

    constructor(start: number, end: number, step: number) {
        this.start = start
        this.end = end
        this.step = step
    }
    toString(): string {
        return `range(${this.start},${this.end},${this.step})`
    }
}
export default Range
