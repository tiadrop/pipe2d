import { interpolateNumbers } from '../lib/Pipe2D';

describe('interpolateNumbers', () => {
    it('should return the topLeft value when blendX and blendY are 0', () => {
        const result = interpolateNumbers(1, 2, 3, 4, 0, 0);
        expect(result).toBe(1);
    });

    it('should return the topRight value when blendX is 1 and blendY is 0', () => {
        const result = interpolateNumbers(1, 2, 3, 4, 1, 0);
        expect(result).toBe(2);
    });

    it('should return the bottomLeft value when blendX is 0 and blendY is 1', () => {
        const result = interpolateNumbers(1, 2, 3, 4, 0, 1);
        expect(result).toBe(3);
    });

    it('should return the bottomRight value when blendX and blendY are 1', () => {
        const result = interpolateNumbers(1, 2, 3, 4, 1, 1);
        expect(result).toBe(4);
    });

    it('should interpolate correctly for blendX and blendY between 0 and 1', () => {
        const result = interpolateNumbers(1, 2, 3, 4, 0.5, 0.5);
        expect(result).toBe(2.5);
    });

    it('should interpolate correctly for different blendX and blendY values', () => {
        const result = interpolateNumbers(1, 2, 3, 4, 0.25, 0.75);
        expect(result).toBeCloseTo(2.75);
    });
});

import { interpolateRGBA, RGBA } from '../lib/imagePipe';

describe('interpolateRGBA', () => {
    it('should interpolate correctly between four RGBA values', () => {
        const tl: RGBA = [255, 0, 0, 255]; // top-left red
        const tr: RGBA = [0, 255, 0, 255]; // top-right green
        const bl: RGBA = [0, 0, 255, 255]; // bottom-left blue
        const br: RGBA = [255, 255, 0, 255]; // bottom-right yellow

        const result = interpolateRGBA(tl, tr, bl, br, 0.5, 0.5);
        expect(result[0]).toBeCloseTo(127.5);
        expect(result[1]).toBeCloseTo(127.5);
        expect(result[2]).toBeCloseTo(63.75);
        expect(result[3]).toBe(255);
    });

    it('should return the top-left color when x and y are 0', () => {
        const tl: RGBA = [255, 0, 0, 255]; // top-left red
        const tr: RGBA = [0, 255, 0, 255]; // top-right green
        const bl: RGBA = [0, 0, 255, 255]; // bottom-left blue
        const br: RGBA = [255, 255, 0, 255]; // bottom-right yellow

        const result = interpolateRGBA(tl, tr, bl, br, 0, 0);
        expect(result).toEqual(tl);
    });

    it('should return the top-right color when x is 1 and y is 0', () => {
        const tl: RGBA = [255, 0, 0, 255]; // top-left red
        const tr: RGBA = [0, 255, 0, 255]; // top-right green
        const bl: RGBA = [0, 0, 255, 255]; // bottom-left blue
        const br: RGBA = [255, 255, 0, 255]; // bottom-right yellow

        const result = interpolateRGBA(tl, tr, bl, br, 1, 0);
        expect(result).toEqual(tr);
    });

    it('should return the bottom-left color when x is 0 and y is 1', () => {
        const tl: RGBA = [255, 0, 0, 255]; // top-left red
        const tr: RGBA = [0, 255, 0, 255]; // top-right green
        const bl: RGBA = [0, 0, 255, 255]; // bottom-left blue
        const br: RGBA = [255, 255, 0, 255]; // bottom-right yellow

        const result = interpolateRGBA(tl, tr, bl, br, 0, 1);
        expect(result).toEqual(bl);
    });

    it('should return the bottom-right color when x and y are 1', () => {
        const tl: RGBA = [255, 0, 0, 255]; // top-left red
        const tr: RGBA = [0, 255, 0, 255]; // top-right green
        const bl: RGBA = [0, 0, 255, 255]; // bottom-left blue
        const br: RGBA = [255, 255, 0, 255]; // bottom-right yellow

        const result = interpolateRGBA(tl, tr, bl, br, 1, 1);
        expect(result).toEqual(br);
    });
});