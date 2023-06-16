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

/**
 * A simple lottie player that does not include the overhead of the lottie player from
 *  https://github.com/LottieFiles/lottie-player. The idea is to make it lightweight to
 *  enable only a few options, and to have external controls.
 * 
 * Anyway this class also enables to add basic controls to the player: play and pause.
 */
class SimpleLottiePlayer {

    constructor (selector, options = {}) {

        // Generate a random ID of a specified length
        const getId = (l = 5) => { const alphabet = "0123456789abcdef"; return Array.from({length: l}, () => alphabet.charAt(Math.floor(Math.random() * alphabet.length))).join(""); }

        let defaultOptions = {
            // The URL to load the animation
            url: null,
            // Function called when the animation has just been loaded
            onAnimationLoaded: (animationData, player) => {},
            // Max width when resizing
            maxWidth: null,
            // Max height when resizing
            maxHeight: null,
            // Start playing on load
            autoplay: true,
            // Loop the animation forever
            loop: true,
            // Automatically resize the container on animation loaded
            autosize: true,
            // Add two overlay divs that act as buttons (play and pause, that work depending on the animation is playing or not)
            controlButtons: false,
            // Add an overlay button that makes the player to display at full size (ignoring the maxWidth and maxHeight parameters)
            fullsizeButton: false,
            // CSS class for buttons
            cssClassControlButtons: null,
            // CSS class for buttons
            cssClassFullsizeButton: null,
            // Function called whenever the play button is clicked
            onPlayBtn: (player) => {},
            // Function called whenever the pause button is clicked
            onPauseBtn: (player) => {},
            // Function called whenever the animation is played
            onPlay: (player) => {},
            // Function called whenever the animation is stopped
            onStop: (player) => {},
            // Function called whenever the animation is paused
            onPause: (player) => {}
        }

        this.options = Object.assign(defaultOptions, options);
        let container = null;
        if (typeof selector === "string") {
            container = document.querySelectorAll(selector);
            if (container.length != 1) {
                throw 'Invalid container';
            }
            container = container[0];
        } else if (selector instanceof Element || selector instanceof HTMLDocument) {
            container = selector
        } else {
            throw ('Invalid container')
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
    /**
     * Plays the animation (from a specific frame, if needed)
     * @param {int} from - the frame from which start to play (if not provided
     *                     will continue from the actual frame)
     */
    play(from = null) {
        if (this._lottie != null) {
            if (from === null) {
                this._lottie.play();
            } else {
                this._lottie.goToAndPlay(from, true);
            }
            if (typeof this.options.onPlay === 'function') {
                this.options.onPlay(this);
            }
        }
    }
    /**
     * Stops the animation and puts it at the beginning so that if it is played
     *  again, it will start from frame 0.
     */
    stop() {
        if (this._lottie != null) {
            this._lottie.stop();
            if (typeof this.options.onStop === 'function') {
                this.options.onStop(this);
            }
        }
    }
    /**
     * Pauses the animation so that if it is started to play again, it will continue
     *  from the frame on it has been paused
     */
    pause() {
        if (this._lottie != null) {
            this._lottie.pause();
            if (typeof this.options.onPause === 'function') {
                this.options.onPause(this);
            }
        }
    }
    /**
     * Obtains the value of whether the animation has been paused or not
     * @returns true if the animation has been paused. False otherwise
     */
    isPaused() {
        if (this._lottie == null) {
            return false;
        }
        return this._lottie.isPaused;
    }
    /**
     * Obtains the frame number that is being rendered.
     * @returns the current frame
     */
    currentFrame() {
        if (this._lottie === null) {
            return null;
        }
        return this._lottie.currentFrame;
    }

    /**
     * Function to be called when an animation has been loaded. In this case, this function adds two overlay buttons 
     *  (if set if the options). One of the buttons acts as "play" and the other as "pause" for the animation.
     * @param {*} animationData - the object that contains the animation loaded
     */
    _onLoaded(animationData) {
        function createSVGNode(tag, attributes) {
            let node = document.createElementNS("http://www.w3.org/2000/svg", tag);
            for (let attributeName in attributes) {
                node.setAttributeNS(null, attributeName, attributes[attributeName]);
            }                
            return node;
        }

        // The container must have relative position so that the overlays appear appropriately
        this._container.style.display = "block";

        // Remove the event handler, if set
        if (this._buttonEventHandler !== null) {
            this._container.removeEventListener("click", this._buttonEventHandler);
            this._buttonEventHandler = null;
        }

        if (this.options.fullsizeButton) {
            let fullScreenBtn = document.createElement("div");
            fullScreenBtn.classList.add(`${this._id}-btn`);
            if (this.options.cssClassFullsizeButton !== null) {
                this.options.cssClassFullsizeButton.split(/\s+/).forEach((c) => fullScreenBtn.classList.add(c));
            }

            // Add the basic styles
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
                bottom: 0,
            });

            let exitFullScreenBtn = fullScreenBtn.cloneNode();
            exitFullScreenBtn.style.display = "none";

            let iconFullScreen = createSVGNode('svg', { width: 16, height: 16, fill: 'currentColor', viewBox: "0 0 16 16" });
            iconFullScreen.appendChild(createSVGNode('path', { d: "M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"}));
            fullScreenBtn.appendChild(iconFullScreen);

            let iconExitFullScreen = createSVGNode('svg', { width: 16, height: 16, fill: 'currentColor', viewBox: "0 0 16 16" });
            iconExitFullScreen.appendChild(createSVGNode('path', { d: "M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5zM0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zm10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4z"}));
            exitFullScreenBtn.appendChild(iconExitFullScreen);

            // Add the buttons
            this._container.prepend(fullScreenBtn);
            this._container.prepend(exitFullScreenBtn);

            // The container must have relative position so that the overlays appear appropriately
            this._container.style.position = "relative";

            let player = this;
            fullScreenBtn.addEventListener('click', function(event) {
                player.resize(player._animationData["w"], player._animationData["h"], true);
                exitFullScreenBtn.style.display = "flex";
                fullScreenBtn.style.display = "none";
                event.stopImmediatePropagation();
            });
            exitFullScreenBtn.addEventListener('click', function(event) {
                player.resize(player._animationData["w"], player._animationData["h"], false);
                exitFullScreenBtn.style.display = "none";
                fullScreenBtn.style.display = "flex";
                event.stopImmediatePropagation();
            });
            fullScreenBtn.addEventListener('mouseover', function(event) {
                fullScreenBtn.style.opacity = "1";
            });
            fullScreenBtn.addEventListener('mouseout', function(event) {
                fullScreenBtn.style.opacity = "0.5";
            });
            exitFullScreenBtn.addEventListener('mouseover', function(event) {
                exitFullScreenBtn.style.opacity = "1";
            });
            exitFullScreenBtn.addEventListener('mouseout', function(event) {
                exitFullScreenBtn.style.opacity = "0.5";
            });
        }

        if (this.options.controlButtons) {
            // Create the overlay divs for the buttons
            let playBtn = document.createElement("div");
            if (this.options.cssClassControlButtons !== null) {
                this.options.cssClassControlButtons.split(/\s+/).forEach((c) => {if (c != "") playBtn.classList.add(c)});
            }

            // Add the basic styles
            Object.assign(playBtn.style, {
                width: "100%",
                height: "100%",
                position: "absolute",
                backgroundColor: "#888888",
                zIndex: "1",
                opacity: "0",
                transitionProperty: "opacity",
                display: "flex",
                color: "white",
            });
            let pauseBtn = playBtn.cloneNode();

            // Now create the SVGs for the drawings
            let iconPlay = createSVGNode('svg', { width: 16, height: 16, fill: 'currentColor', viewBox: "0 0 16 16" });
            Object.assign(iconPlay.style, {
                margin: "auto",
                width: "25%",
                height: "25%"
            });

            let iconPause = iconPlay.cloneNode();

            // Add each path
            iconPlay.appendChild(
                createSVGNode('path', { d: "M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" })
            );
            iconPlay.appendChild(
                createSVGNode('path', { d: "M6.271 5.055a.5.5 0 0 1 .52.038l3.5 2.5a.5.5 0 0 1 0 .814l-3.5 2.5A.5.5 0 0 1 6 10.5v-5a.5.5 0 0 1 .271-.445z" })
            )
            iconPause.appendChild(
                createSVGNode('path', { d: "M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" })
            )
            iconPause.appendChild(
                createSVGNode('path', { d: "M5 6.25a1.25 1.25 0 1 1 2.5 0v3.5a1.25 1.25 0 1 1-2.5 0v-3.5zm3.5 0a1.25 1.25 0 1 1 2.5 0v3.5a1.25 1.25 0 1 1-2.5 0v-3.5z" })
            )

            // Add the icons to the overlays
            playBtn.appendChild(iconPlay);
            pauseBtn.appendChild(iconPause);

            // Add the overlays to the container
            this._container.prepend(playBtn);
            this._container.prepend(pauseBtn);

            // The container must have relative position so that the overlays appear appropriately
            this._container.style.position = "relative";

            // Add a event handler for the controls
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
                overlay.style.opacity = 0.6;
                overlay.style.transitionDuration = "0s"
                setTimeout(() => {
                    overlay.style.transitionDuration = "1s"
                    overlay.style.opacity = 0;
                }, 750);
            }
            this._container.addEventListener("click", this._buttonEventHandler);
        }
    }
    /**
     * Function that receives an arbitrary object, either a JSON object, a string or an URL,
     *  and tries to return a JSON object. If the incoming parameter was an object, it will
     *  be returned as-is. If it is a string, it will be parsed to a JSON object and if not
     *  possible, it will be considered an URL and will be retrieved and its content will be
     *  tried to be a JSON content.
     * @param {*} src - object, string with JSON content or an URL
     * @returns an object or NULL if not possible.
     */
    async _retrieveJSON(src) {
        if (typeof src === "object") {
            return src;
        }
        try {
            return JSON.parse(src);
        } catch (e) {
            // Try construct an absolute URL from the src URL
            const srcUrl = new URL(src, window.location.href);
            let remoteContent;
            try {
                remoteContent = await fetch(srcUrl.toString());
                return await remoteContent.json();
            } catch (e) {
                throw(`could not retrieve the animation from ${src}: ${e}`);
            }
        }
    }
    /**
     * Loads a lottie animation from the parameter pathToAnimation, that can be
     *   either a JSON object, a string with a JSON content, or an URL from which
     *   to obtain the JSON content.
     * @param {string, json} pathToAnimation 
     */
    async load(pathToAnimation, options = null) {
        if (this._lottie != null) {
            this._lottie.destroy();
            this._lottie = null;
        }

        if (options !== null) {
            this.options = Object.assign(this.options, options);
        }

        let animationData = await this._retrieveJSON(pathToAnimation);
        this._lottie = await lottie.loadAnimation({
            container: this._container,
            renderer: 'svg',
            loop: this.options.loop === true,
            autoplay: this.options.autoplay === true,
            animationData: animationData
        });
        if (this.options.autosize) {
            this.resize(animationData["w"], animationData["h"]);
        }
        this._animationData = animationData;
        this._onLoaded(animationData);
        if (typeof this.options.onAnimationLoaded === 'function') {
            this.options.onAnimationLoaded(animationData, this);
        }
    }
    /**
     * Updates the options for the object
     * @param {dict} options: new options
     */
    async updateOptions(options) {
        if (this._animationData === null) {
            this.options = Object.assign(this.options, options);
            return;
        } else {
            return this.load(this._animationData, options);
        }
    }
    /**
     * Obtains a SVG from a frame number [frame]
     * @param {int} frame - the frame to obtain the SVG object
     * @returns an SVG in XML format (ready to be used as image source)
     */
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
    /**
     * Updates the size of the container of the player. It takes into account the values
     *  maxWidth and maxHeight in the options. If set, they are respected as maximum sizes
     *  but the aspect ratio will be kept.
     * @param {double} newWidth - the new desired width
     * @param {double} newHeight - the new desired height
     * @param {boolean} force - ignores the maxWidth and maxHeight parameters
     */
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

/**
 * A class that is able to deal with lottie animation in memory, so that it is not
 *  needed to have an interface to show the content of the animation.
 * 
 * This is useful to e.g. render in memory and obtain frames.
 */
class MemLottiePlayer extends SimpleLottiePlayer {
    constructor (options = {}) {
        let container = document.createElement("div");

        // Create the object, but remove those options that have no sense for the in-mem player
        super(container, 
            Object.assign({}, options, {
                controlButtons: false,
                onPlayBtn: null,
                onPauseBtn: null
            })            
        );
    }   
    /**
     * Function to enable the call to option onAnimationLoaded callback upon loading
     *  the animation (once the animation has been retrieved and successfully loaded)
     *  in the player.
     * @param {json} animationData - the animation data (i.e. the JSON object that
     *                               contains the animation).
     */
    _onLoaded(animationData) {
    }
}

(()=>{
    if (document.addEventListener !== undefined) {
        document.addEventListener('DOMContentLoaded', function(e) {
            let lottiePlayers = document.querySelectorAll("simplelottie");

            function getAttributes(element, attributeNames, camelToSnake = true, initialize = false) {
                const camelToSnakeCase = camelToSnake? str => str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`) : str => str;            

                let result = {};
                attributeNames.forEach((attributeName, _) => {

                    // Accept the construction <attributeName>:<type>
                    let parts = attributeName.split(":");
                    attributeName = parts[0];

                    // Get the value and convert the type, if needed
                    let value = element.getAttribute(camelToSnakeCase(attributeName));
                    if (value != null) {
                        let type = "string"
                        if (parts.length > 1) {
                            type = parts[1].toLowerCase();
                        }
                        switch (type) {
                            case "int":
                                try { value = parseInt(value); } catch (_) { }; break;
                            case "float":
                                try { value = parseFloat(value); } catch (_) { }; break;
                            case "bool":
                                value = [ "", "true", "1" ].indexOf(value.toLowerCase()) >= 0; break;
                        }
                        result[attributeName] = value;
                    } else {
                        if (initialize) {
                            result[attributeName] = null;
                        }
                    }
                })
                return result;
            }

            lottiePlayers.forEach( (player, i) => {
                let defaultOptions = {
                    url: null,
                    maxWidth: null,
                    maxHeight: null,
                    loop: true,
                    autoplay: true,
                    controlButtons: false,
                    fullsizeButton: false,
                    autosize: true,
                    cssClassControlButtons: null,
                    cssClassFullsizeButton: null                    
                }
                let options = Object.assign(defaultOptions, 
                    getAttributes(player, [ 
                        "url", "maxWidth:int", "maxHeight:int", "loop:bool", 
                        "autoplay:bool", "controlButtons:bool", "fullsizeButton:bool", 
                        "cssClassControlButtons", "cssClassFullsizeButton", "autosize:bool" 
                    ])
                );
                new SimpleLottiePlayer(player, options);
            });
        });
    }
})()