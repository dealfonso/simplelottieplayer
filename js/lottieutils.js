/**
MIT License

Copyright (c) 2023 Carlos A. (https://github.com/dealfonso)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

class LottieUtils {
  /**
   * Modifies the [animation] to make that the content displayed is the one that corresponds to
   *  the provided bounding box.
   * 
   * (*) This function just converts the layers in the animation to an asset of type precomp animation
   *  and sets a translation and a size to show so that the resulting rendering animation is just
   *  the bounding box provided.
   * 
   * @param {json} animation - the json object that represents the lottie animation
   * @param {int} minX - bounding box
   * @param {int} minY 
   * @param {int} maxX 
   * @param {int} maxY 
   * @returns {json} an animation whose rendering viewport corresponds to the bounding box
   */
  static trimAnimation(animation, minX, minY, maxX, maxY) {

    // Clone the animation so that the original object is not modified
    animation = JSON.parse(JSON.stringify(animation));

    if (animation["assets"] == null) {
      animation["assets"] = [];
    }

    // Generate an animation Id
    const animationId = `animation-${LottieUtils.getId(8)}`;

    // Convert the current layers to an asset
    animation["assets"].push(
      {
        "id": animationId,
        "layers": JSON.parse(JSON.stringify(animation["layers"]))
      }
    )

    // Set the main layer to draw the animation translated
    animation["layers"] = [
        {
        "ddd": 0,
        "ind": 0,
        "ty": 0,
        "nm": "Precomp Layer",
        "refId": animationId,
        "ks": {
          "a": { "a": 0, "k": [ 0, 0 ] },
          "p": { "a": 0, "k": [ -minX, -minY ]},
          "s": {
              "a": 0,
              "k": [
                  100,
                  100
              ]
          },
          "r": {
              "a": 0,
              "k": 0
          },
          "sk": {
              "a": 0,
              "k": 0
          },
          "sa": {
              "a": 0,
              "k": 0
          },
          "o": {
              "a": 0,
              "k": 100
          },
        },
        // The asset has the parameters of the actual animation
        "fr": animation["fr"],
        "w": animation["w"],  
        "h": animation["h"],
        "ip": animation["ip"],
        "op": animation["op"],
        "st": 0
      }
    ]
    // But the current animation is smaller, because we have trimmed it
    animation["w"] = maxX - minX;
    animation["h"] = maxY - minY;
    // console.log(minX, minY, maxX, maxY, animation["w"], animation["h"])
    return animation;
  }

  /**
   * Generates a random ID String (using hex characters) of a [length]
   * @param {int} length of the Id
   * @returns a random string of the desired length
   */
  static getId(length = 5) { 
    const alphabet = "0123456789abcdef"; 
    return Array.from({length: length}, () => alphabet.charAt(Math.floor(Math.random() * alphabet.length))).join(""); 
  }



  /**
   * Function that obtains the bounding box of an [image], using the function [isBackground] to
   *  determine whether a pixel is empty or not (i.e. it is a background or not).
   * 
   * @return [minX, minY, maxX, maxY ] for the current image
   */
  static getImageBB(image, isBackground = (r, g, b, a) => (r == 0) && (g == 0) && (b == 0) && (a == 0)) {
    let minX = 0, minY = 0, maxX = 0, maxY = 0;

    let width = image.width;
    let height = image.height;
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    let context = canvas.getContext("2d");

    let columnEmpty = new Array(height).fill(true);
    let rowEmpty = new Array(width).fill(true);

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

    // Now get the bounding box
    let r,g,b,a;
    let imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let x = 0; x < canvas.width; x++) {
      for (let y = 0; y < canvas.height; y++) {
        let pos = ( y * canvas.width + x ) * 4;
        [ r, g, b, a ] = [ imageData[pos], imageData[pos + 1], imageData[pos + 2], imageData[pos + 3 ] ]
        if (!isBackground(r, g, b, a)) {
          columnEmpty[x] = false;
          rowEmpty[y] = false;
        }
      }
    }

    while (minX < canvas.width) {
      if (!columnEmpty[minX]) {
        break;
      }
      minX++;
    }
    maxX = canvas.width - 1;
    while (maxX > minX) {
      if (!columnEmpty[maxX]) {
        break;
      }
      maxX--;
    }
    while (minY < canvas.height) {
      if (!rowEmpty[minY]) {
        break;
      }
      minY++;
    }
    maxY = canvas.height - 1;
    while (maxY > minY) {
      if (!rowEmpty[maxY]) {
        break;
      }
      maxY--;
    }    

    if (maxX < minX) {
      maxX = 0;
    }
    if (maxY < minY) {
      maxY = 0;
    }

    return [ minX, minY, maxX, maxY ];
  }

  /**
   * Function that generates a blob that can be consumed in the application
   * @param {any} content - the content that must contain the blob
   * @param {string} contentType - the content type for the blob
   * @returns the blob
   */
  static getBlob(content, contentType = "") {
    let blob = new Blob([content], {type:`${contentType};charset=utf-8`});
    let URL = window.URL || window.webkitURL || window;
    let blobURL = URL.createObjectURL(blob);
    return blobURL;
  }

  /**
   * Function that calculates the bounding boxes for frames between [firstFrame] and [lastFrame] of a lottie animation
   *  that is loaded in [player]
   * 
   * If provided, [onFrameCallback] will be called whenever a frame has been analized. If the return of
   *  that function call is [false], will mean that the process is to be interrupted and _calculateBoundingBox_ 
   *  will _reject_ the promise.
   * 
   * The function returns a promise that is resolved to an object that contains an array for the bounding 
   *  boxes of each frames (zero-indexed: position 0 for frame firstFrame), and the bounding box for the whole
   *  animation.
   *    {
   *      framesBoundingBoxes: [ [ minX0, minY0, maxX0, maxY0 ] ... ],
   *      bouningBox: [ minX, minY, maxX, maxY ]
   *    }
   */ 
  static calculateBoundingBox(player, firstFrame, lastFrame, onFrameCallback = (currentFrame, frameBoundingBox, animationBoundingBox, minFrame, maxFrame) => true) {

    let image = new Image();

    return new Promise((resolve, reject) => {

      let currentFrame = firstFrame;
      let minX = 99999, minY = 99999, maxX = 0, maxY = 0;
      let frameBoundingBox = [];

      image.onload = () => {
        // Get the bounding box for the current image 
        let currentMinX, currentMinY, currentMaxX, currentMaxY;
        [ currentMinX, currentMinY, currentMaxX, currentMaxY ] = LottieUtils.getImageBB(image);
        frameBoundingBox.push([ currentMinX, currentMinY, currentMaxX, currentMaxY ]);

        // Update the bounding box values
        minX = Math.min(minX, currentMinX);
        minY = Math.min(minY, currentMinY);
        maxX = Math.max(maxX, currentMaxX);
        maxY = Math.max(maxY, currentMaxY);

        // Call the function (if provided)
        if (typeof onFrameCallback === 'function') {
          if (onFrameCallback(currentFrame, [ currentMinX, currentMinY, currentMaxX, currentMaxY ], [ minX, minY, maxX, maxY ], firstFrame, lastFrame) === false) {
            reject(`interrupted at frame ${currentFrame}`);
            return;
          }
        }

        if (currentFrame < lastFrame) {
          // If there are more frames to generate, let's generate the next one
          currentFrame++;
          generateNextImage();
        } else {
          // If there are no more frames, resolve the promise
          resolve({
            "framesBoundingBoxes": frameBoundingBox,
            "animationBoundingBox": [ minX, minY, maxX, maxY ]
          })
        }
      }

      // This is the function that triggers the generation of the next frame
      function generateNextImage() {
        let imageSvg = player.getFrame(currentFrame);
        image.src = LottieUtils.getBlob(imageSvg, "image/svg+xml");
      }

      generateNextImage();
    });
  }
}