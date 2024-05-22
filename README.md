# `Pipe2D`

## Summary

A simple random access 2D transform pipeline interface

## Description

Inspired by [graphics shaders](https://en.wikipedia.org/wiki/Shader), Pipe2D provides a simple unified addressing interface for a transforming pipeline to any 2-dimensional concept.

For example, `imagePipe(image)` creates an interface `get(x, y)` that samples the image at the given coordinates, with optional antialiasing for non-integral coordinates.

We can chain this with other 'pipes' to transform that pixel data, and how it's read. The following demo reads a displacement map from a pipeline and applies it to image sampling coordinates to create a refraction and magnification effect inside the mouse pointer:

### [[interactive demo](https://aleta.codes/pipe2d-demo/)] [[full demo source](./demo/src/main.ts)]

The refraction logic can be summarised as:

```ts
const screenPipe: Pipe2D<RGBA> = {
	width: canvas.width,
	height: canvas.height,
	get(x, y) {
		const [
			refractX,
			refractY
		] = refractionPipe.get(x + cursorX, y + cursorY);
		return backgroundPipe.get(x + refractX, y + refractY);
	}
}

const render = () => renderRGBAPipeToCanvas(screenPipe, myCanvas);
```
With such a unified interface we can easily swap pipes around and apply general transforms such as `scalePipe(source)`, `rotatePipe(source, direction)` and many more.

Pipe2D is not limited to graphics. We can just as easily apply such transformation to anything that's addressable in two dimensions:

```ts
// grid.data: number[x][y]
const dataPipe = arrayPipeXY(grid.data, grid.width, grid.height, -1); // Pipe2D<number>
const flipped = horizontalFlipPipe(dataPipe); // Pipe2D<number>
const rotated = rotatePipe(flipped, "right"); // rotated.width == dataPipe.height &v/v
// maybe the numbers in grid.data are indices for a Thing array?
const thingPipe: Pipe2D<Thing> = {
	width: dataPipe.width,
	height: dataPipe.width,
	get: (x, y) => things[dataPipe.get(x, y)];
};

// let's visualise our nice new Thing grid with a heatmap of thing.score:
const heatMap = mapPipe(thingPipe, thing => rgba(thing.score / maxScore, 0, 0, 1)); // Pipe2D<RGBA>
// rendered to a canvas at 5x scale:
renderPixelPipeToCanvas(scalePipe(heatMap, 5), myCanvas);
```

Of course, its real purpose is to explore the concept.

## Thoughts & ideas

* An alternative `imagePipe()` that reads from a changing image. This will likely require temporary caching of `ImageData`, likely with a `WeakMap` and managed near-immediate invalidating timers.
* Optimise `pipeSequence()` by reversing the input sequence and ignoring anything in the chain after finding a pixel of `alpha >= 1`.
* `applyPixel()` is rough due to my limited maths skills.
* The `antialiasPipe()` logic could probably also be better.
* There may be bugs.
