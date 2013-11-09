(function() {
"use strict";
// floor.js - by Arthur Langereis
// for ref, a C version that processed 8 pixels per loop
// could do 500+ fps on a G4/500 (in 8-bit color)
// yes 500 MHz, this was around 1999

var xmid = 320, xmax = 640,
	ymid = 240, ymax = 240,
	uscale = 1,
	vscale = 150,
	eye_height = 150,
	red_tint = 1.0,
	green_tint = 1.0,
	blue_tint = 1.3;

var ctx, tex, offscreen,
	dtab = [],
	udelta = 0, vdelta = 0,
	frames = 0,
	t0;

function img(src) {
	var image = new Image(),
		fut = Q.defer();

	image.onload = function() { fut.resolve(image); };
	image.src = src;

	return fut.promise;
}

function imgdata(src) {
	return img(src).then(function(image) {
		var cvs = document.createElement("canvas");
		cvs.width = image.width;
		cvs.height = image.height;
		var tc = cvs.getContext("2d");
		tc.drawImage(image, 0, 0);

		return tc.getImageData(0,0, image.width, image.height);
	});
}

function gen_dtable() {
	// depth table, creates a 1/4 sine wave from 0 to y
	// for each line, spread out over 256 values
	var period = 0.5 * Math.PI / (ymax - 1);

	for (var y = 0; y < ymax; y++)
		for (var i=0; i<256; i++)
			dtab[y * 256 + i] = i * Math.sin(y * period);
}

function drawFloor(XX) {
	var pixels = offscreen.data,
		texpix = tex.data,
		tex_offset = 0,
		dst_offset = 0,
		depth_offset = 0,
		q, u, v, a, b, c, d,
		intensity, color;

	c = uscale * xmid;
	d = vdelta;
		
	for (var y=0; y < ymax; ++y) {
		q = eye_height / (y + 1);
		v = vscale * q + d;  // (150 * (150 / y)) + dv

		a = udelta - c * q;  // u-delta - (320 * (100 / y))
		b = uscale * q;      // q

		tex_offset = (v << 10) & 0x3fc00; // tex = 32bit
		depth_offset = y << 8;

		for (var x=0; x < xmax;	++x) {
			// line offset into texture
			u = (a << 2) & 0x3fc;
			intensity = texpix[tex_offset + u + 1]; // use green channel
			color = dtab[depth_offset + intensity];
			a += b;

			pixels[dst_offset]     = color;
			pixels[dst_offset + 1] = color;
			pixels[dst_offset + 2] = (color * blue_tint) << 0;
			pixels[dst_offset + 3] = 255;

			dst_offset += 4;
		}
	}

	// -- next
	ctx.putImageData(offscreen, 0, ymid);
	++frames;
	// eye_height++;
	vdelta++;
	requestAnimationFrame(drawFloor);
}

window.floor = function floor(canvas) {
	gen_dtable();
	ctx = canvas.getContext("2d");
	console.info(canvas.getContext("experimental-webgl"));

	imgdata("Floor.png").then(function(texture) {
		tex = texture;
		offscreen = ctx.createImageData(xmax, ymax);

		t0 = Date.now();
		setInterval(function() {
			var t = Date.now();
			status = Math.round(frames / ((t - t0) / 1000));
			t0 = t;
			frames = 0;
		}, 2000);

		drawFloor();
	});
};

}());
