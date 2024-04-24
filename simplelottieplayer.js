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
    static trimAnimation(animation, minX, minY, maxX, maxY) {
        animation = JSON.parse(JSON.stringify(animation));
        if (animation["assets"] == null) {
            animation["assets"] = [];
        }
        const animationId = `animation-${LottieUtils.getId(8)}`;
        animation["assets"].push({
            id: animationId,
            layers: JSON.parse(JSON.stringify(animation["layers"]))
        });
        animation["layers"] = [ {
            ddd: 0,
            ind: 0,
            ty: 0,
            nm: "Precomp Layer",
            refId: animationId,
            ks: {
                a: {
                    a: 0,
                    k: [ 0, 0 ]
                },
                p: {
                    a: 0,
                    k: [ -minX, -minY ]
                },
                s: {
                    a: 0,
                    k: [ 100, 100 ]
                },
                r: {
                    a: 0,
                    k: 0
                },
                sk: {
                    a: 0,
                    k: 0
                },
                sa: {
                    a: 0,
                    k: 0
                },
                o: {
                    a: 0,
                    k: 100
                }
            },
            fr: animation["fr"],
            w: animation["w"],
            h: animation["h"],
            ip: animation["ip"],
            op: animation["op"],
            st: 0
        } ];
        animation["w"] = maxX - minX;
        animation["h"] = maxY - minY;
        return animation;
    }
    static getId(length = 5) {
        const alphabet = "0123456789abcdef";
        return Array.from({
            length: length
        }, () => alphabet.charAt(Math.floor(Math.random() * alphabet.length))).join("");
    }
    static getImageBB(image, isBackground = (r, g, b, a) => r == 0 && g == 0 && b == 0 && a == 0) {
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
        let r, g, b, a;
        let imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let x = 0; x < canvas.width; x++) {
            for (let y = 0; y < canvas.height; y++) {
                let pos = (y * canvas.width + x) * 4;
                [ r, g, b, a ] = [ imageData[pos], imageData[pos + 1], imageData[pos + 2], imageData[pos + 3] ];
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
    static getBlob(content, contentType = "") {
        let blob = new Blob([ content ], {
            type: `${contentType};charset=utf-8`
        });
        let URL = window.URL || window.webkitURL || window;
        let blobURL = URL.createObjectURL(blob);
        return blobURL;
    }
    static calculateBoundingBox(player, firstFrame, lastFrame, onFrameCallback = (currentFrame, frameBoundingBox, animationBoundingBox, minFrame, maxFrame) => true) {
        let image = new Image();
        return new Promise((resolve, reject) => {
            let currentFrame = firstFrame;
            let minX = 99999, minY = 99999, maxX = 0, maxY = 0;
            let frameBoundingBox = [];
            image.onload = () => {
                let currentMinX, currentMinY, currentMaxX, currentMaxY;
                [ currentMinX, currentMinY, currentMaxX, currentMaxY ] = LottieUtils.getImageBB(image);
                frameBoundingBox.push([ currentMinX, currentMinY, currentMaxX, currentMaxY ]);
                minX = Math.min(minX, currentMinX);
                minY = Math.min(minY, currentMinY);
                maxX = Math.max(maxX, currentMaxX);
                maxY = Math.max(maxY, currentMaxY);
                if (typeof onFrameCallback === "function") {
                    if (onFrameCallback(currentFrame, [ currentMinX, currentMinY, currentMaxX, currentMaxY ], [ minX, minY, maxX, maxY ], firstFrame, lastFrame) === false) {
                        reject(`interrupted at frame ${currentFrame}`);
                        return;
                    }
                }
                if (currentFrame < lastFrame) {
                    currentFrame++;
                    generateNextImage();
                } else {
                    resolve({
                        framesBoundingBoxes: frameBoundingBox,
                        animationBoundingBox: [ minX, minY, maxX, maxY ]
                    });
                }
            };
            function generateNextImage() {
                let imageSvg = player.getFrame(currentFrame);
                image.src = LottieUtils.getBlob(imageSvg, "image/svg+xml");
            }
            generateNextImage();
        });
    }
}

class SimpleLottiePlayer {
    constructor(selector, options = {}) {
        const getId = (l = 5) => {
            const alphabet = "0123456789abcdef";
            return Array.from({
                length: l
            }, () => alphabet.charAt(Math.floor(Math.random() * alphabet.length))).join("");
        };
        let defaultOptions = {
            url: null,
            onAnimationLoaded: (animationData, player) => {},
            maxWidth: null,
            maxHeight: null,
            autoplay: true,
            loop: true,
            autosize: true,
            controlButtons: false,
            fullsizeButton: false,
            cssClassControlButtons: null,
            cssClassFullsizeButton: null,
            repeatCount: 0,
            onPlayBtn: player => {},
            onPauseBtn: player => {},
            onPlay: player => {},
            onStop: player => {},
            onPause: player => {}
        };
        this.options = Object.assign(defaultOptions, options);
        let container = null;
        if (typeof selector === "string") {
            container = document.querySelectorAll(selector);
            if (container.length != 1) {
                throw "Invalid container";
            }
            container = container[0];
        } else if (selector instanceof Element || selector instanceof HTMLDocument) {
            container = selector;
        } else {
            throw "Invalid container";
        }
        this._container = container;
        container.getLottiePlayer = () => this;
        this._lottie = null;
        this._selector = selector;
        this._animationData = null;
        this._id = `player-${getId()}`;
        this._buttonEventHandler = null;
        if (this.options.url !== null) {
            this.load(this.options.url);
        }
    }
    play(from = null) {
        if (this._lottie != null) {
            if (from === null) {
                this._lottie.play();
            } else {
                this._lottie.goToAndPlay(from, true);
            }
            if (typeof this.options.onPlay === "function") {
                this.options.onPlay(this);
            }
        }
    }
    stop() {
        if (this._lottie != null) {
            this._lottie.stop();
            if (typeof this.options.onStop === "function") {
                this.options.onStop(this);
            }
        }
    }
    pause() {
        if (this._lottie != null) {
            this._lottie.pause();
            if (typeof this.options.onPause === "function") {
                this.options.onPause(this);
            }
        }
    }
    isPaused() {
        if (this._lottie == null) {
            return false;
        }
        return this._lottie.isPaused;
    }
    currentFrame() {
        if (this._lottie === null) {
            return null;
        }
        return this._lottie.currentFrame;
    }
    _onLoaded(animationData) {
        function createSVGNode(tag, attributes) {
            let node = document.createElementNS("http://www.w3.org/2000/svg", tag);
            for (let attributeName in attributes) {
                node.setAttributeNS(null, attributeName, attributes[attributeName]);
            }
            return node;
        }
        this._container.style.display = "block";
        if (this._buttonEventHandler !== null) {
            this._container.removeEventListener("click", this._buttonEventHandler);
            this._buttonEventHandler = null;
        }
        if (this.options.fullsizeButton) {
            let fullScreenBtn = document.createElement("div");
            fullScreenBtn.classList.add(`${this._id}-btn`);
            if (this.options.cssClassFullsizeButton !== null) {
                this.options.cssClassFullsizeButton.split(/\s+/).forEach(c => fullScreenBtn.classList.add(c));
            }
            Object.assign(fullScreenBtn.style, {
                padding: "8px",
                width: "32px",
                height: "32px",
                position: "absolute",
                backgroundColor: "#888888",
                zIndex: "2",
                opacity: "0.5",
                transitionProperty: "opacity",
                display: "flex",
                color: "white",
                right: 0,
                bottom: 0
            });
            let exitFullScreenBtn = fullScreenBtn.cloneNode();
            exitFullScreenBtn.style.display = "none";
            let iconFullScreen = createSVGNode("svg", {
                width: 16,
                height: 16,
                fill: "currentColor",
                viewBox: "0 0 16 16"
            });
            iconFullScreen.appendChild(createSVGNode("path", {
                d: "M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"
            }));
            fullScreenBtn.appendChild(iconFullScreen);
            let iconExitFullScreen = createSVGNode("svg", {
                width: 16,
                height: 16,
                fill: "currentColor",
                viewBox: "0 0 16 16"
            });
            iconExitFullScreen.appendChild(createSVGNode("path", {
                d: "M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5zM0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zm10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4z"
            }));
            exitFullScreenBtn.appendChild(iconExitFullScreen);
            this._container.prepend(fullScreenBtn);
            this._container.prepend(exitFullScreenBtn);
            this._container.style.position = "relative";
            let player = this;
            fullScreenBtn.addEventListener("click", function(event) {
                player.resize(player._animationData["w"], player._animationData["h"], true);
                exitFullScreenBtn.style.display = "flex";
                fullScreenBtn.style.display = "none";
                event.stopImmediatePropagation();
            });
            exitFullScreenBtn.addEventListener("click", function(event) {
                player.resize(player._animationData["w"], player._animationData["h"], false);
                exitFullScreenBtn.style.display = "none";
                fullScreenBtn.style.display = "flex";
                event.stopImmediatePropagation();
            });
            fullScreenBtn.addEventListener("mouseover", function(event) {
                fullScreenBtn.style.opacity = "1";
            });
            fullScreenBtn.addEventListener("mouseout", function(event) {
                fullScreenBtn.style.opacity = "0.5";
            });
            exitFullScreenBtn.addEventListener("mouseover", function(event) {
                exitFullScreenBtn.style.opacity = "1";
            });
            exitFullScreenBtn.addEventListener("mouseout", function(event) {
                exitFullScreenBtn.style.opacity = "0.5";
            });
        }
        if (this.options.controlButtons) {
            let playBtn = document.createElement("div");
            if (this.options.cssClassControlButtons !== null) {
                this.options.cssClassControlButtons.split(/\s+/).forEach(c => {
                    if (c != "") playBtn.classList.add(c);
                });
            }
            Object.assign(playBtn.style, {
                width: "100%",
                height: "100%",
                position: "absolute",
                backgroundColor: "#888888",
                zIndex: "1",
                opacity: "0",
                transitionProperty: "opacity",
                display: "flex",
                color: "white"
            });
            let pauseBtn = playBtn.cloneNode();
            let iconPlay = createSVGNode("svg", {
                width: 16,
                height: 16,
                fill: "currentColor",
                viewBox: "0 0 16 16"
            });
            Object.assign(iconPlay.style, {
                margin: "auto",
                width: "25%",
                height: "25%"
            });
            let iconPause = iconPlay.cloneNode();
            iconPlay.appendChild(createSVGNode("path", {
                d: "M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"
            }));
            iconPlay.appendChild(createSVGNode("path", {
                d: "M6.271 5.055a.5.5 0 0 1 .52.038l3.5 2.5a.5.5 0 0 1 0 .814l-3.5 2.5A.5.5 0 0 1 6 10.5v-5a.5.5 0 0 1 .271-.445z"
            }));
            iconPause.appendChild(createSVGNode("path", {
                d: "M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"
            }));
            iconPause.appendChild(createSVGNode("path", {
                d: "M5 6.25a1.25 1.25 0 1 1 2.5 0v3.5a1.25 1.25 0 1 1-2.5 0v-3.5zm3.5 0a1.25 1.25 0 1 1 2.5 0v3.5a1.25 1.25 0 1 1-2.5 0v-3.5z"
            }));
            playBtn.appendChild(iconPlay);
            pauseBtn.appendChild(iconPause);
            this._container.prepend(playBtn);
            this._container.prepend(pauseBtn);
            this._container.style.position = "relative";
            let player = this;
            this._buttonEventHandler = function() {
                let overlay = null;
                if (player.isPaused()) {
                    player.play();
                    if (typeof player.options.onPlayBtn === "function") {
                        player.options.onPlayBtn(player);
                    }
                    overlay = playBtn;
                } else {
                    player.pause();
                    if (typeof player.options.onPauseBtn === "function") {
                        player.options.onPauseBtn(player);
                    }
                    overlay = pauseBtn;
                }
                overlay.style.opacity = .6;
                overlay.style.transitionDuration = "0s";
                setTimeout(() => {
                    overlay.style.transitionDuration = "1s";
                    overlay.style.opacity = 0;
                }, 750);
            };
            this._container.addEventListener("click", this._buttonEventHandler);
        }
    }
    async _retrieveJSON(src) {
        if (typeof src === "object") {
            return src;
        }
        try {
            return JSON.parse(src);
        } catch (e) {
            const srcUrl = new URL(src, window.location.href);
            let remoteContent;
            try {
                remoteContent = await fetch(srcUrl.toString());
                return await remoteContent.json();
            } catch (e) {
                throw `could not retrieve the animation from ${src}: ${e}`;
            }
        }
    }
    async load(pathToAnimation, options = null) {
        if (this._lottie != null) {
            this._lottie.destroy();
            this._lottie = null;
        }
        if (options !== null) {
            this.options = Object.assign(this.options, options);
        }
        let animationData = await this._retrieveJSON(pathToAnimation);
        let loop = this.options.loop === true;
        if (loop === true && this.options.repeatCount > 0) {
            loop = this.options.repeatCount - 1;
        }
        this._lottie = await lottie.loadAnimation({
            container: this._container,
            renderer: "svg",
            loop: loop,
            autoplay: this.options.autoplay === true,
            animationData: animationData
        });
        if (this.options.autosize) {
            this.resize(animationData["w"], animationData["h"]);
        }
        this._animationData = animationData;
        this._onLoaded(animationData);
        if (typeof this.options.onAnimationLoaded === "function") {
            this.options.onAnimationLoaded(animationData, this);
        }
    }
    async updateOptions(options) {
        if (this._animationData === null) {
            this.options = Object.assign(this.options, options);
            return;
        } else {
            return this.load(this._animationData, options);
        }
    }
    getFrame(frame) {
        if (this._lottie == null) {
            return null;
        }
        let currentFrame = this._lottie.currentFrame;
        if (currentFrame != frame) {
            this._lottie.goToAndStop(frame, true);
        }
        const svgElement = this._container.querySelector("svg");
        const data = new XMLSerializer().serializeToString(svgElement);
        if (currentFrame != frame) {
            this._lottie.goToAndStop(currentFrame, true);
        }
        return data;
    }
    resize(newWidth, newHeight, force = false) {
        let width = newWidth;
        let height = newHeight;
        if (!force) {
            if (this.options.maxWidth != null) {
                width = Math.min(width, this.options.maxWidth);
            }
            if (this.options.maxHeight != null) {
                height = Math.min(height, this.options.maxHeight);
            }
            let rW = width / newWidth;
            let rH = height / newHeight;
            let r = Math.min(rW, rH);
            width = r * newWidth;
            height = r * newHeight;
        }
        this._container.style.width = `${width}px`;
        this._container.style.height = `${height}px`;
        if (this._lottie != null) {
            this._lottie.resize(width, height);
        }
    }
}

class MemLottiePlayer extends SimpleLottiePlayer {
    constructor(options = {}) {
        let container = document.createElement("div");
        super(container, Object.assign({}, options, {
            controlButtons: false,
            onPlayBtn: null,
            onPauseBtn: null
        }));
    }
    _onLoaded(animationData) {}
}

(() => {
    if (document.addEventListener !== undefined) {
        document.addEventListener("DOMContentLoaded", function(e) {
            let lottiePlayers = document.querySelectorAll("simplelottie");
            function getAttributes(element, attributeNames, camelToSnake = true, initialize = false) {
                const camelToSnakeCase = camelToSnake ? str => str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`) : str => str;
                let result = {};
                attributeNames.forEach((attributeName, _) => {
                    let parts = attributeName.split(":");
                    attributeName = parts[0];
                    let value = element.getAttribute(camelToSnakeCase(attributeName));
                    if (value != null) {
                        let type = "string";
                        if (parts.length > 1) {
                            type = parts[1].toLowerCase();
                        }
                        switch (type) {
                          case "int":
                            try {
                                value = parseInt(value);
                            } catch (_) {}
                            ;
                            break;

                          case "float":
                            try {
                                value = parseFloat(value);
                            } catch (_) {}
                            ;
                            break;

                          case "bool":
                            value = [ "", "true", "1", attributeName ].indexOf(value.toLowerCase()) >= 0;
                            break;
                        }
                        result[attributeName] = value;
                    } else {
                        if (initialize) {
                            result[attributeName] = null;
                        }
                    }
                });
                return result;
            }
            lottiePlayers.forEach((player, i) => {
                let defaultOptions = {
                    url: null,
                    maxWidth: null,
                    maxHeight: null,
                    loop: true,
                    autoplay: true,
                    controlButtons: false,
                    fullsizeButton: false,
                    autosize: false,
                    cssClassControlButtons: null,
                    cssClassFullsizeButton: null,
                    repeatCount: 0
                };
                let options = Object.assign(defaultOptions, getAttributes(player, [ "url", "maxWidth:int", "maxHeight:int", "loop:bool", "repeatCount:int", "autoplay:bool", "controlButtons:bool", "fullsizeButton:bool", "cssClassControlButtons", "cssClassFullsizeButton", "autosize:bool" ]));
                new SimpleLottiePlayer(player, options);
            });
        });
    }
})();
