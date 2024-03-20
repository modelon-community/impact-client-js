import { Client } from '../../src'
import { expect, test } from 'vitest'

test('Try instantiating from impact session from node', () => {
    const testFun = () => Client.fromImpactSession({});
    expect(testFun).toThrow(Error);
    expect(testFun).toThrow("Impact session can only be used from browser.");
})
