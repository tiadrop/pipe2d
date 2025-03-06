import { Pipe2D } from "./Pipe2D";

export type RGBA = [number, number, number, number];

type ImagePipeOptions = {
	/**
	 * @property Specifies a value to return when sampling outside of the source image's bounds
	 */
	oob: RGBA;
	/**
	 * @property Disables interpolation
	 */
	nearest: boolean;
}

/**
 * Creates a Pipe2D that samples an image
 * @param image 
 * @param options 
 */
export function createImagePipe(image: HTMLImageElement, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Creates a Pipe2D that samples an image
 * @param source
 * @param options 
 */
export function createImagePipe(source: HTMLCanvasElement | OffscreenCanvas, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Creates a Pipe2D that samples an image
 * @param source
 * @param options 
 */
export function createImagePipe(source: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Creates a Pipe2D that samples an image
 * @param data
 * @param options 
 */
export function createImagePipe(data: ImageData, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Rasterises an Pipe2D<RGBA> and creates a Pipe2D that samples the result
 * @param source
 * @param options 
 */
export function createImagePipe(source: Pipe2D<RGBA>, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Loads an image from a URL and creates a Pipe2D that samples it
 * @param url
 * @param options
 */
export function createImagePipe(url: string, options?: Partial<ImagePipeOptions>): Promise<Pipe2D<RGBA>>
export function createImagePipe(source: string | Pipe2D<RGBA> | ImageData | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, options: Partial<ImagePipeOptions> = {}): Pipe2D<RGBA> | Promise<Pipe2D<RGBA>> {

    if (typeof source == "string") {
        const src = source;
        return new Promise((resolve, reject) => {
            const img = document.createElement("img");
            img.onload = () => resolve(createImagePipe(img, options));
            img.onerror = (e) => reject(e);
            img.src = src;
        });
    }

    const opts: ImagePipeOptions = {
        oob: [0, 0, 0, 0],
        nearest: false,
        ...options,
    };

    if (source instanceof HTMLImageElement) {
        const img = source as HTMLImageElement;
        const canvas = new OffscreenCanvas(img.naturalWidth, img.naturalHeight);
        const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
        ctx.drawImage(img, 0, 0);
        source = canvas;
    }

    if (
        source instanceof HTMLCanvasElement
        || source instanceof OffscreenCanvas
    ) source = source.getContext("2d") as OffscreenCanvasRenderingContext2D;

    if (
        source instanceof CanvasRenderingContext2D
        || source instanceof OffscreenCanvasRenderingContext2D
    ) source = source.getImageData(0, 0, source.canvas.width, source.canvas.height);

    if (source instanceof ImageData) {
        const imageData = source as ImageData;

        const buffer = new ArrayBuffer(imageData.data.length);
        const bytes = new Uint8ClampedArray(buffer);
        const ints = new Uint32Array(buffer);

        ints[1] = 0xcafebabe;
        let isLittleEndian = bytes[7] === 0xca && bytes[0] === 0xba;

        bytes.set(imageData.data);

        const intToRgba: (n: number) => RGBA = isLittleEndian
            ? n => [n>>>24, n>>16&0xff, n>>8&0xff, n&0xff]
            : n => [n&0xff, n>>8&0xff, n>>16&0xff, n>>>24];	

        const samplePipe: Pipe2D<RGBA> = new Pipe2D<RGBA>(
            imageData.width,
            imageData.height,
            (x, y) => intToRgba(ints[Math.round(y) * imageData.width + Math.round(x)])
        );

        return opts.nearest
            ? samplePipe
            : samplePipe.interpolate(interpolateRGBA);
    }

    // Pipe2D<RGBA> source
    return createImagePipe(renderRGBAPipeToCanvas(source), options);
};



// no xywh
export function renderRGBAPipeToCanvas(texture: Pipe2D<RGBA>): OffscreenCanvas
export function renderRGBAPipeToCanvas(texture: Pipe2D<RGBA>, canvas: OffscreenCanvas | HTMLCanvasElement): void
export function renderRGBAPipeToCanvas(texture: Pipe2D<RGBA>, context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void
export function renderRGBAPipeToCanvas(texture: Pipe2D<RGBA>, imageData: ImageData): void
// xy
export function renderRGBAPipeToCanvas(texture: Pipe2D<RGBA>): OffscreenCanvas
export function renderRGBAPipeToCanvas(texture: Pipe2D<RGBA>, canvas: OffscreenCanvas | HTMLCanvasElement, dx: number, dy: number): void
export function renderRGBAPipeToCanvas(texture: Pipe2D<RGBA>, context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, dx: number, dy: number): void
export function renderRGBAPipeToCanvas(texture: Pipe2D<RGBA>, imageData: ImageData, dx: number, dy: number): void
// xywh
export function renderRGBAPipeToCanvas(texture: Pipe2D<RGBA>, width: number, height: number): OffscreenCanvas
export function renderRGBAPipeToCanvas(texture: Pipe2D<RGBA>, canvas: OffscreenCanvas | HTMLCanvasElement, dx: number, dy: number, dw: number, dh: number): void
export function renderRGBAPipeToCanvas(texture: Pipe2D<RGBA>, context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number): void
export function renderRGBAPipeToCanvas(texture: Pipe2D<RGBA>, imageData: ImageData, dx: number, dy: number, dw: number, dh: number): void
export function renderRGBAPipeToCanvas(texture: Pipe2D<RGBA>, target?: ImageData | OffscreenCanvas | HTMLCanvasElement | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | number, dx: number = 0, dy: number = 0, dw: number = texture.width, dh: number = texture.height): void | OffscreenCanvas {
    if (typeof target == "number") {
        dw = target;
        dh = dx;
        target = undefined;
    }
    if (!target) {
        const canvas = new OffscreenCanvas(texture.width, texture.height);
        renderRGBAPipeToCanvas(texture, canvas, dx, dy, dw, dh);
        return canvas;
    }
    if (target instanceof ImageData) {
        for (let x = 0; x < target.width; x++) {
            const px = Math.round((x / target.width) * texture.width);
            for (let y = 0; y < target.height; y++) {
                const idx = (y * target.width + x) * 4;
                const py = target.height == texture.height
                    ? y
                    : Math.round((y / target.height) * texture.height);
                const pixel = texture.get(px + .499, py + .499);
                target.data[idx] = pixel[0];
                target.data[idx+1] = pixel[1];
                target.data[idx+2] = pixel[2];
                target.data[idx+3] = pixel[3];
            }
        }
        return;
    }
    const canvasContext = (
        target instanceof CanvasRenderingContext2D
        || target instanceof OffscreenCanvasRenderingContext2D
    ) ? target : (target as any).getContext("2d") as OffscreenCanvasRenderingContext2D;

    const imageData = canvasContext.createImageData(dw, dh);
    renderRGBAPipeToCanvas(texture, imageData);
    canvasContext.putImageData(imageData, dx, dy);
};



/**
 * Interpolates between four RGBA colours based on the given x and y coordinates.
 *
 * @param tl - The top-left RGBA colour.
 * @param tr - The top-right RGBA colour.
 * @param bl - The bottom-left RGBA colour.
 * @param br - The bottom-right RGBA colour.
 * @param x - The horizontal interpolation factor (0 to 1).
 * @param y - The vertical interpolation factor (0 to 1).
 * @returns The interpolated RGBA colour.
 */
export function interpolateRGBA(tl: RGBA, tr: RGBA, bl: RGBA, br: RGBA, x: number, y: number) {
    return blendRGBA(
        blendRGBA(tl, tr, x),
        blendRGBA(bl, br, x),
        y
    );
}

const blendRGBA = (from: RGBA, to: RGBA, progress: number) => {
	if (progress == 0) return from;
	return [
		blendNumbers(from[0], to[0], progress),
		blendNumbers(from[1], to[1], progress),
		blendNumbers(from[2], to[2], progress),
		blendNumbers(from[3], to[3], progress),
	] as RGBA;
};


const blendNumbers = (from: number, to: number, progress: number) => {
    return from + (to - from) * progress;
};

