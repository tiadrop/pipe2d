# `Pipe2D`

## Summary

2D transformation pipelines

## Description

Inspired by [graphics shaders](https://en.wikipedia.org/wiki/Shader), Pipe2D provides a simple unified addressing interface for a transforming pipeline to any 2-dimensional concept.

For example, `createImagePipe(image|canvas)`, provided by `@xtia/pipe2d-image`, creates a Pipe2D that samples an image at the given coordinates, with optional interpolation for non-integral coordinates.

We can chain this to transform that pixel data, and how it's read. The following demo reads a displacement map from a pipeline and applies it to image sampling coordinates to create a refraction and magnification effect inside the mouse pointer:

### [[interactive demo](https://aleta.codes/pipe2d-demo/)] [[full demo source](https://gist.github.com/tiadrop/403d5a5c7c452622e579cc3f1705384c)]

The refraction logic can be summarised as:

```ts
import { renderRGBAPipe, createImagePipe } from "@xtia/pipe2d-image";

const refractionStrength = 10;
const refractionImage = await createImagePipe("cursor-refraction-map.png");

// read red and green channels as refraction offset
const refractionPipe = refractionImage.map(rgba => [
	((rgba.red / 255) - .5) * refractionStrength,
	((rgba.green / 255) - .5) * refractionStrength,
]); // Pipe2D<[x, y]>

function renderCursorBackground(cursorX: number, cursorY: number) {
	// create a pipe to read background from refracted coordinates
	const cursorPipe = backgroundPipe.mapCoordinates((x, y) => {
		const [refractX, refractY] = refractionPipe.get(x, y);
		return [x + refractX, y + refractY];
	}).crop(cursorX, cursorY, cursorCanvas.width, cursorCanvas.height);
	// draw it on a canvas
	renderRGBAPipe(cursorCanvas);
}
```
Pipe2D is not limited to graphics. We can just as easily apply such transformation to anything that's addressable in two dimensions:

```ts
import { Pipe2D } from "@xtia/pipe2d";

// create a pipe to read from a 2D array (number[x][y])
const dataPipe = Pipe2D.fromColumns(gridData, gridWidth, gridHeight); // Pipe2D<number>
const flipped = dataPipe.horizontalFlip(); // Pipe2D<number>
const rotated = flipped.rotate("right"); // rotated.width == dataPipe.height &v/v
// maybe the numbers in the array are indices for a Thing array?
const thingPipe = dataPipe.map(
	idx => things[idx],
); // Pipe2D<Thing>

// now we can grab a Thing from any position:
const specificThing = thingPipe.get(13, 37);

// let's visualise our nice new Thing grid with a heatmap of thing.score:

import { RGBA } from "@xtia/rgba";

const heatMap = thingPipe.floorCoordinates().map(
	thing => new RGBA((255, 0, 0, thing.score / maxScore) * 255)
); // Pipe2D<RGBA>

// stretched and rendered to a canvas:

import { renderRGBAPipe } from "@xtia/pipe2d-image";

renderRGBAPipe(heatMap, heatmapCanvas);
```
This is the process that the above code simplifies: `renderRGBAPipe()` will, for each pixel on the target canvas, read (x, y) from the `stretch` pipe, which will read an adjusted (x, y) from `heatMap`, which will read (x, y) from `thingPipe`, which will read (x, y) from `dataPipe`, which will `floor()` x and y and read and return the corresponding data from `grid.data`. `thingPipe` will read and return from `things` using that data as an index, `heatMap` will create and return pixel data using that `Thing`'s `score`, `stretch` pipe will return that and `renderRGBAPipe()` will draw it where it belongs.

## Properties

* `rows` contains a 2D [LiveArray](https://www.npmjs.com/package/@xtia/live-array) that reads the pipe as rows
* `columns` contains a 2D [LiveArray](https://www.npmjs.com/package/@xtia/live-array) that reads the pipe as columns
* `width` and `height` provide the pipe's dimensions

## Methods

* `map<U>(modifier: (value: T) => U)` creates a new pipe that reads the parent and performs a value transformation on the result
* `toArrayXY()` reads all integral coordinates of the pipe and exports the results to a 2D array with [x][y] layout
* `toArrayYX()` reads all integral coordinates of the pipe and exports the results to a 2D array with [y][x] layout
* `toFlatArrayXY()` reads all integral coordinates of the pipe and exports the results to a flat array with [[0,0],[1,0],...] (horizontal stripes) layout
* `toFlatArrayYX()` reads all integral coordinates of the pipe and exports the results to a flat array with [[0,0],[0,1],...] (vertical stripes) layout
* `crop(x, y, width, height)` creates a new pipe that reads a specific portion of the parent
* `mapCoordinates(modifier: (x, y) => [number, number])` creates a new pipe that reads the parent from modified coordinates
* `translate(x, y)` creates a new pipe that reads the parent from translated coordinates
* `horizontalFlip()` / `verticalFlip()` creates a new pipe that reverse horizontal/vertical coordinates
* `rotate(direction)` creates a new pipe that rotate coordinates according to direction (`"left" | "right" | "over"`), swapping width and height where appropriate
* `rotate(angle: Angle[, originX, originY])` creates a new pipe that rotates coordinates by an arbitrary angle; width and height are adjusted accordingly. Origin offsets may be number or `"centre" | "center"` (default is centre)
* `scale(scaleValue)` / `scale(scaleX, scaleY)` creates a new pipe that reads the parent by scaled coordinates. The resulting pipe's dimensions are the parent's multiplied by scaleValue
* `stretch(width, height)` creates a new pipe of specified dimensions, which reads the parent by appropriately adjusted coordinates
* `loop()` creates a pipe that reads the parent, wrapping out-of-bounds reads
* `clampCoordinates()` creates a pipe that reads the parent from clamped coordinates
* `interpolate(resolver)` creates a pipe that samples the parent around non-integral coordinates and returns an interpolated value provided by `resolver: (topLeft, topRight, bottomLeft, bottomRight, blendX, blendY) => T`; Resolver functions are included to interpolate numbers (`interpolateNumbers`) and RGBA values (`interpolateRGBA`)
* `interpolateAs(resolver)`
* `roundCoordinates()` / `floorCoordinates()` creates a pipe that rounds/floors coordinates before reading the parent
* `oob(value)` creates a pipe that reads the parent at valid coordinates, and returns `value` for coordinates outside of its dimensions
* `stash()` gets and stores values at every integral location in the pipe and creates a pipe to access those

## Static Methods

* `solid(value, width?, height?)` creates a pipe that returns `value` for any read
* `fromColumns(source, height, fallback?)` creates a pipe that reads from a 2D array arranged in columns
* `fromRows(source, height, fallback?)` creates a pipe that reads from a 2D array arranged in rows
* `fromFlatArrayXY(source)` creates a pipe that reads from a flat array with [[0,0],[1,0],...] (horizontal stripes) layout
* `fromFlatArrayYX(source)` creates a pipe that reads from a flat array with [[0,0],[0,1],...] (vertical stripes) layout
* `stack(sources, fallback?)` creates a pipe that reads from the last source (`{x, y, pipe}`) that intersects given coordinates
