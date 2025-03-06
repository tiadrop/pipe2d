import { LiveArray, liveArray } from "@xtia/live-array";
import { Angle } from "@xtia/mezr";

/**
 * A 2D data structure with various transformation and manipulation methods.
 *
 * @template T - The type of the elements in the 2D data structure.
 */
export class Pipe2D<T> {
    readonly width: number;
    readonly height: number;
    readonly columns: LiveArray<LiveArray<T>>;
    readonly rows: LiveArray<LiveArray<T>>;
    private getter: (x: number, y: number) => T;

    /**
     * Retrieves the value at the specified coordinates (x, y).
     * @param x - The x-coordinate.
     * @param y - The y-coordinate.
     * @returns The value at the specified coordinates.
     */
    get(x: number, y: number): T {
        return this.getter(x, y);
    }

    constructor(
        width: number,
        height: number,
        getter: (x: number, y: number) => T,
    ) {
        this.width = width;
        this.height = height;
        this.getter = getter;

        this.rows = liveArray({
            getLength: () => this.height,
            get: rowIdx => liveArray({
                getLength: () => this.width,
                get: colIdx => this.get(colIdx, rowIdx),
            })
        });

        this.columns = liveArray({
            getLength: () => this.width,
            get: colIdx => liveArray({
                getLength: () => this.height,
                get: rowIdx => this.get(colIdx, rowIdx),
            })
        });
    }

    /**
     * Applies a modifier function to each element in the 2D pipe and returns a new Pipe2D instance with the modified values.
     *
     * @template U - The type of the elements in the new Pipe2D instance.
     * @param modifier - A function that takes a value of type T and returns a value of type U.
     * @returns A new Pipe2D instance with the modified values.
     */
    map<U>(modifier: (value: T) => U) {
        return new Pipe2D(
            this.width,
            this.height,
            (x, y) => {
                return modifier(this.getter(x, y))
            }
        );
    }

    /**
     * Converts the 2D data structure into an array of arrays, where each inner array represents a column.
     * 
     * @returns {T[][]} A 2D array where each sub-array represents a column of the original data structure.
     */
    toArrayXY() {
        const columns: T[][] = [];
        const width = this.width;
        const height = this.height;
        for (let x = 0; x < width; x++) {
            const column: T[] = [];
            columns.push(column);
            for (let y = 0; y < height; y++) {
                column.push(this.getter(x, y));
            }
        }
        return columns;
    }

    /**
     * Converts the 2D data structure into an array of arrays, where each inner array represents a row.
     * 
     * @returns {T[][]} A 2D array where each sub-array represents a row of the original data structure.
     */
    toArrayYX() {
        return this.rotate("left").horizontalFlip().toArrayXY();
    }

    toFlatArrayXY() {
        const array: T[] = [];
        const width = this.width;
        const height = this.height;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                array.push(this.getter(x, y));
            }
        }
        return array;
    }

    toFlatArrayYX() {
        return this.rotate("left").horizontalFlip().toFlatArrayXY();
    }

    /**
     * Crops a section of the current Pipe2D instance and returns a new Pipe2D instance
     * with the specified dimensions.
     *
     * @param x - The x-coordinate of the top-left corner of the cropping area.
     * @param y - The y-coordinate of the top-left corner of the cropping area.
     * @param width - The width of the cropping area.
     * @param height - The height of the cropping area.
     * @returns A new Pipe2D instance representing the cropped area.
     */
    crop(x: number, y: number, width: number, height: number) {
        return new Pipe2D(
            width,
            height,
            (getX, getY) => this.getter(x + getX, y + getY),
        );
    }

    /**
     * Maps the coordinates of the current Pipe2D instance using the provided modifier function.
     * The modifier function takes the original x and y coordinates and returns a new pair of coordinates.
     * The new Pipe2D instance will use these modified coordinates to retrieve values.
     *
     * @param modifier - A function that takes the original x and y coordinates and returns a new pair of coordinates [mx, my].
     * @returns A new Pipe2D instance with the modified coordinates.
     */
    mapCoordinates(modifier: (x: number, y: number) => [number, number]) {
        return new Pipe2D(
            this.width,
            this.height,
            (x, y) => {
                const [mx, my] = modifier(x, y);
                return this.getter(mx, my);
            }
        );
    }

    /**
     * Translates the coordinates by the given x and y values.
     *
     * @param x - The amount to translate along the x-axis.
     * @param y - The amount to translate along the y-axis.
     * @returns The new coordinates after translation.
     */
    translate(x: number, y: number) {
        return this.mapCoordinates((mx, my) => [mx + x, my + y]);
    }

    horizontalFlip() {
        return this.mapCoordinates((x, y) => [this.width - x, y]);
    }

    verticalFlip() {
        return this.mapCoordinates((x, y) => [x, this.height - y]);
    }

    rotate(direction: "left" | "right" | "over",): Pipe2D<T>
    rotate(angle: Angle): Pipe2D<T>
    rotate(angle: Angle, originX?: number | "centre" | "center", originY?: number | "centre" | "center"): Pipe2D<T>
    rotate(directionOrAngle: Angle | "left" | "right" | "over", originX: number | "centre" | "center" = "centre", originY: number | "centre" | "center" = "centre") {
        if (typeof directionOrAngle == "string") return new Pipe2D(
            directionOrAngle == "over" ? this.width : this.height,
            directionOrAngle == "over" ? this.height : this.width,
            {
                left: (x: number, y: number) => {
                    return this.get(this.width - y - 1, x)
                },
                right: (x: number, y: number) => {
                    return this.get(y, this.height - x - 1)
                },
                over: (x: number, y: number) => {
                    return this.get(this.width - x - 1, this.height - y - 1);
                }
            }[directionOrAngle]
        );
    
        const radAngle = directionOrAngle.asRadians;
        const cosA = Math.cos(radAngle);
        const sinA = Math.sin(radAngle);
    
        const centerX = typeof originX !== "number" ? this.width / 2 : originX;
        const centerY = typeof originY !== "number" ? this.height / 2 : originY;
    
        return new Pipe2D(
            Math.max(
                Math.abs(cosA * this.width) + Math.abs(sinA * this.height),
                Math.abs(sinA * this.width) + Math.abs(cosA * this.height)
            ),
            Math.max(
                Math.abs(cosA * this.width) + Math.abs(sinA * this.height),
                Math.abs(sinA * this.width) + Math.abs(cosA * this.height)
            ),
            (x, y) => {
                const dx = x - centerX;
                const dy = y - centerY;
    
                const srcX = Math.round(dx * cosA + dy * sinA) + centerX;
                const srcY = Math.round(-dx * sinA + dy * cosA) + centerY;
    
                if (srcX < 0 || srcX >= this.width || srcY < 0 || srcY >= this.height) {
                    return undefined as unknown as T;
                }
                return this.get(srcX, srcY);
            }
        );
    }

    scale(scale: number): Pipe2D<T>
    scale(scaleX: number, scaleY: number): Pipe2D<T>
    scale(scaleX: number, scaleY: number = scaleX): Pipe2D<T> {
	    return new Pipe2D<T>(
            this.width * scaleX,
            this.height * scaleY,
            (x, y) => this.getter(x / scaleX, y / scaleY),
        );
    };

    /**
     * Creates a new Pipe2D that modifies coordinates to a new width and height.
     * 
     * @param newWidth - The new width to stretch the Pipe2D object to.
     * @param newHeight - The new height to stretch the Pipe2D object to.
     * @returns A new Pipe2D object with the specified width and height.
     */
    stretch(newWidth: number, newHeight: number): Pipe2D<T> {
        const ratioX = (this.width) / (newWidth);
        const ratioY = (this.height) / (newHeight);
        return new Pipe2D(
            newWidth,
            newHeight,
            (x, y) => {
                const scaledX = x * ratioX;
                const scaledY = y * ratioY;
                return this.get(scaledX, scaledY);
            },
        );
    }
    
    /**
     * Creates a new Pipe2D instance with wrapped coordinates.
     * 
     * This method returns a new Pipe2D object where the coordinates are wrapped
     * around the width and height of the original Pipe2D instance.
     * 
     * @returns {Pipe2D<T>} A new Pipe2D instance with wrapped coordinates.
     */
    loop(): Pipe2D<T> {
        return new Pipe2D(this.width, this.height, (x, y) => {
            const wrappedX = ((x % this.width) + this.width) % this.width;
            const wrappedY = ((y % this.height) + this.height) % this.height;
            return this.getter(wrappedX, wrappedY);
        });
    }

    clampCoordinates() {
        return this.mapCoordinates((x, y) => [
            Math.max(0, Math.min(this.width - 1, x)),
            Math.max(0, Math.min(this.height - 1, y)),
        ]);
    }

    /**
     * Interpolates values within a 2D grid using a provided resolver function.
     *
     * @param resolver - A function that takes the values at the four corners of a cell
     * (top-left, top-right, bottom-left, bottom-right) and the blend factors (blendX, blendY)
     * and returns the interpolated value.
     * @returns A new Pipe2D instance with the interpolated values.
     */
    interpolate(resolver: (
        topLeft: T,
        topRight: T,
        bottomLeft: T,
        bottomRight: T,
        blendX: number,
        blendY: number
    ) => T): Pipe2D<T> {
        const w = this.width / (this.width+1);
        const h = this.height / (this.height+1);
        return new Pipe2D(this.width, this.height, (x, y) => {
            if (Number.isInteger(x) && Number.isInteger(y)) {
                return this.getter(x, y);
            }
            x = Math.max(0, Math.min(this.width - 1, x * w));
            y = Math.max(0, Math.min(this.height - 1, y * h));
            const topLeft = this.getter(Math.floor(x), Math.floor(y));
            const topRight = this.getter(Math.ceil(x), Math.floor(y));
            const bottomLeft = this.getter(Math.floor(x), Math.ceil(y));
            const bottomRight = this.getter(Math.ceil(x), Math.ceil(y));
            return resolver(topLeft, topRight, bottomLeft, bottomRight, x % 1, y % 1);
        });
    }

    /**
     * Interpolates values within a 2D grid using a custom resolver function.
     * 
     * @template U - The type of the interpolated value.
     * @param resolver - A function that takes the values at the four corners of a cell
     * (top-left, top-right, bottom-left, bottom-right) and the blend factors along the x and y axes,
     * and returns the interpolated value.
     * @returns A new `Pipe2D` instance with the interpolated values.
     */
    interpolateAs<U>(resolver: (
        topLeft: T,
        topRight: T,
        bottomLeft: T,
        bottomRight: T,
        blendX: number,
        blendY: number
    ) => U): Pipe2D<U> {
        const w = this.width / (this.width+1);
        const h = this.height / (this.height+1);
        return new Pipe2D(this.width, this.height, (x, y) => {
            x = Math.max(0, Math.min(this.width - 1, x * w));
            y = Math.max(0, Math.min(this.height - 1, y * h));
            const topLeft = this.getter(Math.floor(x), Math.floor(y));
            const topRight = this.getter(Math.ceil(x), Math.floor(y));
            const bottomLeft = this.getter(Math.floor(x), Math.ceil(y));
            const bottomRight = this.getter(Math.ceil(x), Math.ceil(y));
            return resolver(topLeft, topRight, bottomLeft, bottomRight, x % 1, y % 1);
        });
    }

    roundCoordinates() {
        return this.mapCoordinates((x, y) => [Math.round(x), Math.round(y)]);
    }

    floorCoordinates() {
        return this.mapCoordinates((x, y) => [Math.floor(x), Math.floor(y)]);
    }
    

    /**
     * Creates a new Pipe2D instance with an out-of-bounds handler.
     * If the provided coordinates are out of the bounds of the current Pipe2D instance,
     * the specified value will be returned instead.
     *
     * @param value - The value to return when the coordinates are out of bounds.
     * @returns A new Pipe2D instance with the out-of-bounds handler applied.
     */
    oob(value: T) {
        return new Pipe2D(this.width, this.height, (x, y) => {
            if (x < 0 || y < 0 || x >= this.width || y >= this.height) return value;
            return this.getter(x, y);
        });
    }

    strict() {
        return new Pipe2D(this.width, this.height, (x, y) => {
            if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
                throw new Error(`Coordinates (${x}, ${y}) are out of bounds`);
            }
            return this.getter(x, y);
        });
    }

    /**
     * Creates a new `Pipe2D` instance with a solid value.
     *
     * @template T - The type of the value.
     * @param value - The value to be used for the `Pipe2D` instance.
     * @param width - The width of the `Pipe2D` instance. Defaults to 0.
     * @param height - The height of the `Pipe2D` instance. Defaults to 0.
     * @returns A new `Pipe2D` instance with the specified value.
     */
    static solid<T>(value: T, width: number = 0, height: number = 0) {
        return new Pipe2D(width, height, () => value);
    }

    /**
     * Creates a `Pipe2D` instance from a 2D array of columns.
     *
     * @template T - The type of elements in the source array.
     * @param {T[][]} source - The 2D array of columns to create the `Pipe2D` instance from.
     * @param {number} height - The height of the resulting `Pipe2D`.
     * @param {T} [fallback] - An optional fallback value to use for missing elements.
     * @returns {Pipe2D<T>} A new `Pipe2D` instance.
     */
    static fromColumns<T>(source: T[][], height: number, fallback?: T): Pipe2D<T> {
        return arrayPipe(source, source.length, height, fallback as T, false);
    }

    /**
     * Creates a `Pipe2D` instance from a 2D array of rows.
     *
     * @template T - The type of elements in the source array.
     * @param {T[][]} source - The 2D array of rows to create the `Pipe2D` instance from.
     * @param {number} width - The width of the resulting `Pipe2D`.
     * @param {T} [fallback] - An optional fallback value to use for missing elements.
     * @returns {Pipe2D<T>} A new `Pipe2D` instance created from the provided 2D array.
     */
    static fromRows<T>(source: T[][], width: number, fallback?: T): Pipe2D<T> {
        return arrayPipe(source, width, source.length, fallback as T, true);
    }

    static fromFlatArrayXY<T>(source: T[], width: number, height: number, fallback?: T): Pipe2D<T> {
        return flatArrayPipe(source, width, height, fallback as T, false);
    };
    
    static fromFlatArrayYX<T>(source: T[], width: number, height: number, fallback?: T): Pipe2D<T> {
        return flatArrayPipe(source, width, height, fallback as T, true);
    };
    
    /**
     * Stacks multiple Pipe2D sources into a single Pipe2D instance.
     * 
     * @template T - The type of the elements in the Pipe2D.
     * @param {Array<{ pipe: Pipe2D<T>; x: number; y: number }>} sources - An array of objects containing a Pipe2D instance and its x, y coordinates.
     * @param {T} [fallback] - An optional fallback value to return if no source covers a given coordinate.
     * @returns {Pipe2D<T>} A new Pipe2D instance that combines the given sources.
     */
    static stack<T>(sources: {
        pipe: Pipe2D<T>;
        x: number;
        y: number;
    }[], fallback?: T): Pipe2D<T> {
        const liveSources = liveArray(sources);
        return new Pipe2D(
            Math.max(...sources.map(s => s.pipe.width + s.x)),
            Math.max(...sources.map(s => s.pipe.height + s.y)),
            (x, y) => {
                const topSource = liveSources.reverseLive().find(s => {
                    const right = s.x + s.pipe.width;
                    const bottom = s.y + s.pipe.height;
                    return x >= s.x && y >= s.y
                        && x < right && y < bottom;
                });
                if (topSource === undefined) return fallback as T;
                return topSource.pipe.get(x - topSource.x, y - topSource.y);
            }
        );
    }
    
}


function arrayPipe<T>(source: T[][], width: number, height: number, oob: T, yx: boolean): Pipe2D<T> {
    return new Pipe2D(width, height, (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return oob;
        [x, y] = yx ? [Math.floor(y), Math.floor(x)] : [Math.floor(x), Math.floor(y)];
        const column = source[x];
        if (!column) return oob;
        const item = column[y];
        return item === undefined ? oob : item;
    });
}

function flatArrayPipe<T>(source: T[], width: number, height: number, oob: T, vertical: boolean): Pipe2D<T> {
    return new Pipe2D(width, height, (x, y) => {
        x = Math.floor(x);
        y = Math.floor(y);
        if (x < 0 || y < 0 || x >= width || y >= height) return oob;
        const item = source[vertical ? x * height + y : y * width + x];
        return item === undefined ? oob : item;
	});
};

/**
 * Interpolates between four corner values based on the provided blend factors.
 *
 * @param topLeft - The value at the top-left corner.
 * @param topRight - The value at the top-right corner.
 * @param bottomLeft - The value at the bottom-left corner.
 * @param bottomRight - The value at the bottom-right corner.
 * @param blendX - The horizontal blend factor (0 to 1).
 * @param blendY - The vertical blend factor (0 to 1).
 * @returns The interpolated value.
 */
export function interpolateNumbers(topLeft: number, topRight: number, bottomLeft: number, bottomRight: number, blendX: number, blendY: number) {
    return topLeft * (1 - blendX) * (1 - blendY) +
        topRight * blendX * (1 - blendY) +
        bottomLeft * (1 - blendX) * blendY +
        bottomRight * blendX * blendY;
}
