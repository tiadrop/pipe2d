# `Pipe2D`

## Summary

A simple random access 2D transform pipeline interface

## Description

Inspired by [graphics shaders](https://en.wikipedia.org/wiki/Shader), Pipe2D provides a simple unified addressing interface for a transforming pipeline to any 2-dimensional concept.

For example, `imagePipe(image|canvas)` creates an interface `get(x, y)` that samples the image at the given coordinates, with optional interpolation for non-integral coordinates.

We can chain this with other 'pipes' to transform that pixel data, and how it's read. The following demo reads a displacement map from a pipeline and applies it to image sampling coordinates to create a refraction and magnification effect inside the mouse pointer:

### [[interactive demo](https://aleta.codes/pipe2d-demo/)] [[full demo source](./demo/src/main.ts)]

The refraction logic can be summarised as:

```ts
const cursorPipe: Pipe2D<RGBA> = {
	width: cursorCanvas.width,
	height: cursorCanvas.height,
	get(x, y) {
		const [
			refractX, refractY
		] = refractionPipe.get(x, y);
		return backgroundPipe.get(
			x + refractX + cursorX,
			y + refractY + cursorY
		);
	}
}

// to draw:
cursorCanvas.getContext("2d")
	.drawImage(
		renderRGBAPipeToCanvas(cursorPipe),
		0, 0
	);
```
With such a unified interface we can easily swap pipes around and apply general transforms such as `scalePipe(source)`, `rotatePipe(source, direction)` and many more.

Pipe2D is not limited to graphics. We can just as easily apply such transformation to anything that's addressable in two dimensions:

```ts
// grid.data: number[x][y]
const dataPipe = arrayPipeXY(grid.data, grid.width, grid.height, -1); // Pipe2D<number>
const flipped = horizontalFlipPipe(dataPipe); // Pipe2D<number>
const rotated = rotatePipe(flipped, "right"); // rotated.width == dataPipe.height &v/v
// maybe the numbers in grid.data are indices for a Thing array?
const thingPipe = mapPipe(
	dataPipe,
	(x, y) => things[dataPipe.get(x, y)],
); // Pipe2D<Thing>

// now we can grab a Thing from any position:
const specificThing = thingPipe.get(13, 37);

// let's visualise our nice new Thing grid with a heatmap of thing.score:
const heatMap = mapPipe(
	thingPipe,
	thing => [thing.score / maxScore, 0, 0, 1] as RGBA
); // Pipe2D<RGBA>

// stretched and rendered to a canvas:
renderRGBAPipeToCanvas(stretchPipe(
	heatMap,
	heatmapCanvas.width,
	heatmapCanvas.height
), heatmapCanvas);
```
This is the process that the above code simplifies: `renderRGBAPipeToCanvas()` will, for each pixel on the target canvas, read (x, y) from the `stretchPipe`, which will read an adjusted (x, y) from `heatMap`, which will read (x, y) from `thingPipe`, which will read (x, y) from `dataPipe`, which will `floor()` x and y and read and return the corresponding data from `grid.data`. `thingPipe` will read and return from `things` using that data as an index, `heatMap` will create and return pixel data using that `Thing`'s `score`, `stretchPipe` will return that and `renderRGBAPipeToCanvas()` will draw it where it belongs.

Of course, its real purpose is to explore the concept.

## Thoughts & ideas

* An alternative `imagePipe()` that reads from a changing image. This will likely require temporary caching of `ImageData`, likely with a `WeakMap` and managed near-immediate invalidating timers.
* Optimise `pipeSequence()` by reversing the input sequence and ignoring anything in the chain after finding a pixel of `alpha >= 1`.
* `applyPixel()` is rough due to my limited maths skills.
* The `antialiasPipe()` logic could probably also be better.
* There may be bugs.
