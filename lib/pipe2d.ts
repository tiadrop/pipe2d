export type RGBA = [number, number, number, number];

export interface Pipe2D<T> {
	readonly width: number;
	readonly height: number;
	readonly get: (x: number, y: number) => T;
}

export const applyPixel = (from: RGBA, to: RGBA) => {
	const toAlpha = to[3];
	if (toAlpha == 0) return from;
	if (toAlpha == 1) return to;
	const fromRGB = from.slice(0, 3);
	const toRGB = to.slice(0, 3);
	const fromAlpha = from[3];
	return [
		blendNumbers(fromRGB[0], toRGB[0], toAlpha),
		blendNumbers(fromRGB[1], toRGB[1], toAlpha),
		blendNumbers(fromRGB[2], toRGB[2], toAlpha),
		Math.max(fromAlpha, toAlpha),
	] as RGBA;
}

const blendNumbers = (from: number, to: number, progress: number) => {
    return from + progress * (to - from);
};

const blendPixel = (from: RGBA, to: RGBA, progress: number) => {
	if (progress == 0) return from;
	if (progress == 1) return to;
	return [
		blendNumbers(from[0], to[0], progress),
		blendNumbers(from[1], to[1], progress),
		blendNumbers(from[2], to[2], progress),
		blendNumbers(from[3], to[3], progress),
	] as RGBA;
};

type ImagePipeOptions = {
	/**
	 * @property Specifies a value to return when sampling outside of the source image's bounds
	 */
	oob: RGBA;
	/**
	 * @property Disables antialiasing
	 */
	nearest: boolean;
}


/**
 * Creates a Pipe2D that samples an image
 * @param image 
 * @param options 
 */
export function imagePipe(image: HTMLImageElement, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Creates a Pipe2D that samples an image
 * @param source
 * @param options 
 */
export function imagePipe(source: HTMLCanvasElement | OffscreenCanvas, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Creates a Pipe2D that samples an image
 * @param source
 * @param options 
 */
export function imagePipe(source: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Creates a Pipe2D that samples an image
 * @param data
 * @param options 
 */
export function imagePipe(data: ImageData, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Rasterises an Pipe2D<RGBA> and creates a Pipe2D that samples the result
 * @param source
 * @param options 
 */
export function imagePipe(source: Pipe2D<RGBA>, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Loads an image from a URL and creates a Pipe2D that samples it
 * @param url
 * @param options
 */
export function imagePipe(url: string, options?: Partial<ImagePipeOptions>): Promise<Pipe2D<RGBA>>
export function imagePipe(source: string | Pipe2D<RGBA> | ImageData | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, options: Partial<ImagePipeOptions> = {}): Pipe2D<RGBA> | Promise<Pipe2D<RGBA>> {

	if (typeof source == "string") {
		const src = source;
		return new Promise((resolve, reject) => {
			const img = document.createElement("img");
			img.onload = () => resolve(imagePipe(img, options));
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
		const canvas = new OffscreenCanvas(source.naturalWidth, source.naturalHeight);
		const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
		ctx.drawImage(source, 0, 0);
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
		const data: RGBA[] = [];
		for (let i = 0; i < source.data.length; i += 4) data.push([
			source.data[i] / 255,
			source.data[i + 1] / 255,
			source.data[i + 2] / 255,
			source.data[i + 3] / 255,
		]);
		const nearestPipe = flatArrayPipeXY(data, source.width, source.height, opts.oob);
		return opts.nearest
			? nearestPipe
			: antialiasPipe(nearestPipe);
	}

	// Pipe2D<RGBA> source
	return imagePipe(renderRGBAPipeToCanvas(source), options);
};

/**
 * Renders a pipe to a two-dimensional array, with a T[x][y] layout
 * @param source
 * @returns 
 */
export function exportPipeXY<T>(source: Pipe2D<T>): T[][] {
	const columns: T[][] = [];
	for (let x = 0; x < source.width; x++) {
		const column: T[] = [];
		columns.push(column);
		for (let y = 0; y < source.height; y++) {
			column.push(source.get(x, y));
		}
	}
	return columns;
};

/**
 * Renders a pipe to a two-dimensional array, with a T[y][x] layout
 * @param source
 * @returns 
 */
export function exportPipeYX<T>(source: Pipe2D<T>): T[][] {
	return exportPipeXY(horizontalFlipPipe(rotatePipe(source, "right")));
};

/**
 * Renders a pipe to a flat array, ordered as T[(0,0), (1,0)...]
 * @param source
 * @returns 
 */
export function exportPipeFlatXY<T>(source: Pipe2D<T>): T[] {
	const items: T[] = [];
	for (let y = 0; y < source.height; y++) {
		for (let x = 0; x < source.width; x++) {
			items.push(source.get(x, y));
		}
	}
	return items;
};

/**
 * Renders a pipe to a flat array, ordered as T[(0,0), (0,1)...]
 * @param source
 * @returns 
 */
export function exportPipeFlatYX<T>(source: Pipe2D<T>): T[] {
	return exportPipeFlatXY(horizontalFlipPipe(rotatePipe(source, "right")));
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
			const px = Math.floor((x / target.width) * texture.width);
			for (let y = 0; y < target.height; y++) {
				const idx = (y * target.width + x) * 4;
				const py = Math.floor((y / target.height) * texture.height);
				const pixel = texture.get(px, py);
				target.data[idx] = pixel[0] * 255;
				target.data[idx+1] = pixel[1] * 255;
				target.data[idx+2] = pixel[2] * 255;
				target.data[idx+3] = pixel[3] * 255;
			}
		}
		return;
	}
	const canvasContext = (
		target instanceof CanvasRenderingContext2D
		|| target instanceof OffscreenCanvasRenderingContext2D
	) ? target : target.getContext("2d") as OffscreenCanvasRenderingContext2D;

	const imageData = canvasContext.createImageData(dw, dh);
	renderRGBAPipeToCanvas(texture, imageData);
	canvasContext.putImageData(imageData, dx, dy);
};

export function pipeSequence(sources: Pipe2D<RGBA>[]): Pipe2D<RGBA> {
	const [width, height] = sources.reduce((pr, p) => [
		Math.max(pr[0], p.width),
		Math.max(pr[1], p.height)
	], [0, 0]);
	return {
		width, height,
		get(x, y) {
			return sources.reduce((r, p) => applyPixel(r, p.get(x, y)), [0, 0, 0, 0] as RGBA)
		}
	}
}

export function offsetPipe<T>(source: Pipe2D<T>, offsetX: number, offsetY: number): Pipe2D<T> {
	return {
		width: source.width + offsetX,
		height: source.height + offsetY,
		get(x, y) {
			return source.get(x - offsetX, y - offsetY);
		}
	}
};

export function createDisplacementMap(source: Pipe2D<RGBA>, strength: number = 5): Pipe2D<[number, number]> {
	return {
		width: source.width,
		height: source.height,
		get: (x, y) => {
			const px = source.get(x, y);
			return [(px[0] - .5) * strength * px[3], (px[1] - .5) * strength * px[3]];
		}
	}	
};

export function coordModPipe<T>(source: Pipe2D<T>, coordMod: (x: number, y: number) => [number, number]): Pipe2D<T> {
	return {
		width: source.width,
		height: source.height,
		get(x, y) {
			const [mx, my] = coordMod(x, y);
			return source.get(mx, my);
		}
	}
};

export function floorPipe<T>(source: Pipe2D<T>): Pipe2D<T> {
	return {
		width: source.width,
		height: source.height,
		get(x, y) {
			return source.get(Math.floor(x), Math.floor(y));
		}
	}
};

export function scalePipe<T>(source: Pipe2D<T>, scale: number): Pipe2D<T>
export function scalePipe<T>(source: Pipe2D<T>, scaleX: number, scaleY: number): Pipe2D<T>
export function scalePipe<T>(source: Pipe2D<T>, scaleX: number, scaleY: number = scaleX): Pipe2D<T> {
	return {
		width: Math.round(source.width * scaleX),
		height: Math.round(source.height * scaleY),
		get(x, y){
			return source.get(x / scaleX, y / scaleY);
		}
	}
};

export function fadePipe(source: Pipe2D<RGBA>, alpha: number): Pipe2D<RGBA> {
	return {
		width: source.width,
		height: source.height,
		get(x, y) {
			const px = source.get(x, y);
			return [px[0], px[1], px[2], px[3] * alpha];
		}
	}
};

export function horizontalFlipPipe<T>(source: Pipe2D<T>): Pipe2D<T> {
	return {
		width: source.width,
		height: source.height,
		get(x, y) {
			return source.get(source.width - x, y);
		}
	}
};

export function verticalFlipPipe<T>(source: Pipe2D<T>): Pipe2D<T> {
	return {
		width: source.width,
		height: source.height,
		get(x, y) {
			return source.get(x, source.height - y);
		}
	}
};

export function rotatePipe<T>(source: Pipe2D<T>, direction: "left" | "right" | "over"): Pipe2D<T> {
	return {
		width: direction == "over" ? source.width : source.height,
		height: direction == "over" ? source.height : source.width,
		get: {
			left: (x: number, y: number) => {
				return source.get(source.width - y, x)
			},
			right: (x: number, y: number) => {
				return source.get(y, source.height - x)
			},
			over: (x: number, y: number) => {
				return source.get(source.width - x, source.height - y);
			}
		}[direction],
	}
};

export function mapPipe<TIn, TOut = TIn>(source: Pipe2D<TIn>, mapFunc: (v: TIn) => TOut): Pipe2D<TOut> {
	return {
		width: source.width,
		height: source.height,
		get(x, y) {
			return mapFunc(source.get(x, y));
		},
	}
};

export function solidPipe<T>(value: T, width: number = 0, height: number = 0, oob: T = value): Pipe2D<T> {
	return {
		width,
		height,
		get: oob == value
			? (_x, _y) => value
			: (x, y) => {
				return (x >= 0 && y >= 0 && x <= width - 1 && y <= height - 1)
					? value
					: oob
			}
	}
};

export function stretchPipe<T>(source: Pipe2D<T>, newWidth: number, newHeight: number): Pipe2D<T> {
	const ratioX = newWidth / source.width;
	const ratioY = newHeight / source.height;
	return {
		width: newWidth,
		height: newHeight,
		get(x, y) {
			return source.get(x / ratioX, y / ratioY);
		}
	}
};

function arrayPipe<T>(source: T[][], width: number, height: number, fallback: T, yx: boolean): Pipe2D<T> {
	return {
		width, height,
		get(x, y) {
			if (x < 0 || y < 0 || x >= width || y >= height) return fallback;
			[x, y] = yx ? [Math.floor(y), Math.floor(x)] : [Math.floor(x), Math.floor(y)];
			const column = source[x];
			if (!column) return fallback;
			const item = column[y];
			return item === undefined ? fallback : item;
		}
	}
};

export function arrayPipeXY<T>(source: T[][], width: number, height: number, fallback: T): Pipe2D<T> {
	return arrayPipe(source, width, height, fallback, false);
};

export function arrayPipeYX<T>(source: T[][], width: number, height: number, fallback: T): Pipe2D<T> {
	return arrayPipe(source, width, height, fallback, true);
};

function flatArrayPipe<T>(source: T[], width: number, height: number, fallback: T, vertical: boolean): Pipe2D<T> {
	return  {
		width, height,
		get(x, y) {
			x = Math.floor(x);
			y = Math.floor(y);
			if (x < 0 || y < 0 || x >= width || y >= height) return fallback;
			const item = source[vertical ? x * height + y : y * width + x];
			return item === undefined ? fallback : item;
		}
	}
};

export function flatArrayPipeXY<T>(source: T[], width: number, height: number, fallback: T): Pipe2D<T> {
	return flatArrayPipe(source, width, height, fallback, false);
};

export function flatArrayPipeYX<T>(source: T[], width: number, height: number, fallback: T): Pipe2D<T> {
	return flatArrayPipe(source, width, height, fallback, true);
};

export function antialiasPipe(source: Pipe2D<RGBA>): Pipe2D<RGBA> {
	return {
		width: source.width,
		height: source.height,
		get(x, y) {
			x += .5;
			y += .5;
			const px = source.get(x, y);
			if (y % 1 == 0 && x % 1 == 0) return px;
			const right = blendPixel(px, source.get(x + 1, y), x % 1);
			const down = blendPixel(px, source.get(x, y + 1), y % 1);
			return blendPixel(right, down, .5);
		}
	}
};
