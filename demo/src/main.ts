import { Pipe2D, RGBA, applyPixel, createDisplacementMap, fadePipe, imagePipe, offsetPipe, renderRGBAPipeToCanvas, scalePipe, stretchPipe } from "../../lib/pipe2d";

const cursorScale = 1.5;
const cursorCanvas = document.getElementById("cursor") as HTMLCanvasElement;
cursorCanvas.width *= cursorScale;
cursorCanvas.height *= cursorScale;
const cursorCanvasContext = cursorCanvas.getContext("2d") as CanvasRenderingContext2D;

(async () => {

	// create a pipe that samples an image at given coordinates
	// this will be used to draw the background
	const backgroundImagePipe = await imagePipe("bg.jpg");

	// create a (scaled) cursor image pipe
	const cursorImage = scalePipe(
		await imagePipe("cursor.png"),
		cursorScale,
	);

	// and a pipe that reads from a pixel pipe (usually an image pipe) and returns [number, number], to use as a displacement map
	// this will read the displacement image's red channel to determine horizontal displacement and green for vertical
	const cursorRefraction = createDisplacementMap(
		scalePipe(
			await imagePipe("cursor-disp.png"),
			cursorScale
		),
		cursorScale * 16, // displacement strength
	);

	let cursorX = -Infinity;
	let cursorY = 1;

	const cursorOverlayPipe: Pipe2D<RGBA> = {
		width: cursorImage.width,
		height: cursorImage.height,
		get(x, y) {
			// grab the displacement values, relative to our cursor
			const [displaceX, displaceY] = cursorRefraction.get(x, y);
			// and the pixel from the cursor image
			const cursorPixel = cursorImage.get(x, y);
			// if there's no displacement here we may as well exit early
			if (displaceX == 0 && displaceY == 0) return cursorPixel;
			// adjust the background image to the current screen size
			const backgroundPipe = stretchPipe(backgroundImagePipe, window.innerWidth, window.innerHeight)
			// grab from backgroundPipe at the displaced coordinates
			const backgroundPixel = backgroundPipe.get(
				x + cursorX - displaceX,
				y + cursorY + displaceY,
			);
			// draw the cursor image pixel on top, et voila, the pixel to display:
			return applyPixel(backgroundPixel, cursorPixel);
		}
	};

	function render(){
		// draw cursor to the overlay canvas:
		cursorCanvasContext.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
		cursorCanvasContext.drawImage(
			renderRGBAPipeToCanvas(cursorOverlayPipe),
			0, 0
		);
	}

	render();




	// the unremarkable stuff; create mouse events to update the cursor position
	document.body.addEventListener("mousemove", ev => {
		cursorX = ev.clientX;
		cursorY = ev.clientY;
		cursorCanvas.style.left = cursorX + "px";
		cursorCanvas.style.top = cursorY + "px";
		render();
	});
	document.body.addEventListener("mouseleave", () => {
		cursorX = -Infinity;
		render();
	})

})();
