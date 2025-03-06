import { Pipe2D } from '../lib/Pipe2D';

describe('Pipe2D', () => {
    let pipe: Pipe2D<number>;

    beforeEach(() => {
        pipe = new Pipe2D(4, 4, (x, y) => x + y * 4);
    });

    it('should scale the coordinates correctly', () => {
        const scaledPipe = pipe.scale(2);
        expect(scaledPipe.get(2, 2)).toBe(pipe.get(1, 1));
    });

    it('should wrap the coordinates correctly', () => {
        const loopedPipe = pipe.loop();
        expect(loopedPipe.get(5, 5)).toBe(pipe.get(1, 1));
        expect(loopedPipe.get(-1, -1)).toBe(pipe.get(3, 3));
    });

    it('should interpolate the values correctly', () => {
        const interpolatedPipe = pipe.interpolate((topLeft, topRight, bottomLeft, bottomRight, blendX, blendY) => {
            return topLeft * (1 - blendX) * (1 - blendY) +
                   topRight * blendX * (1 - blendY) +
                   bottomLeft * (1 - blendX) * blendY +
                   bottomRight * blendX * blendY;
        });
        expect(interpolatedPipe.get(1.5, 1.5)).toBeCloseTo(6.0, 0.1);
    });

    it('should scale the coordinates correctly with different factors', () => {
        const scaledPipe = pipe.scale(3);
        expect(scaledPipe.get(3, 3)).toBe(pipe.get(1, 1));
    });

    it('should wrap the coordinates correctly with negative coordinates', () => {
        const loopedPipe = pipe.loop();
        expect(loopedPipe.get(-5, -5)).toBe(pipe.get(3, 3));
    });

    it('should interpolate the values correctly at different points', () => {
        const interpolatedPipe = pipe.interpolate((topLeft, topRight, bottomLeft, bottomRight, blendX, blendY) => {
            return topLeft * (1 - blendX) * (1 - blendY) +
                   topRight * blendX * (1 - blendY) +
                   bottomLeft * (1 - blendX) * blendY +
                   bottomRight * blendX * blendY;
        });
        expect(interpolatedPipe.get(0.5, 0.5)).toBeCloseTo(2.0, 0.1);
        expect(interpolatedPipe.get(2.5, 2.5)).toBeCloseTo(10.0, 0.1);
    });
});

