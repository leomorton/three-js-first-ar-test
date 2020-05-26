/**
 * @author mrdoob / http://mrdoob.com
 * @author Mugen87 / https://github.com/Mugen87
 */

var ARButton = {
    createButton: function (renderer, sessionInit = {}, startSessionCallback) {
        function showStartAR(/*device*/) {
            var currentSession = null;

            function onSessionStarted(session) {
                session.addEventListener('end', onSessionEnded);

                /*
				session.updateWorldTrackingState( {
					'planeDetectionState': { 'enabled': true }
				} );
				*/

                renderer.xr.setReferenceSpaceType('local');
                renderer.xr.setSession(session);
                button.textContent = 'STOP AR';

                currentSession = session;
            }

            function onSessionEnded(/*event*/) {
                currentSession.removeEventListener('end', onSessionEnded);

                button.textContent = 'START AR';

                currentSession = null;
            }

            //

            button.style.display = '';

            button.style.cursor = 'pointer';
            button.style.left = 'calc(50% - 100px)';
            button.style.width = '200px';

            button.textContent = 'START AR';

            button.onmouseenter = function () {
                button.style.opacity = '1.0';
            };

            button.onmouseleave = function () {
                button.style.opacity = '0.7';
            };

            button.onclick = function () {
                if (currentSession === null) {
                    navigator.xr
                        .requestSession('immersive-ar', sessionInit)
                        .then(onSessionStarted);
                    startSessionCallback();
                } else {
                    currentSession.end();
                }
            };
        }

        function disableButton() {
            button.style.display = '';

            button.style.cursor = 'auto';
            button.style.left = 'calc(50% - 75px)';
            button.style.width = '150px';

            button.onmouseenter = null;
            button.onmouseleave = null;

            button.onclick = null;
        }

        function showARNotSupported() {
            disableButton();

            button.textContent = 'AR NOT SUPPORTED';
        }

        function stylizeElement(element) {
            element.style.position = 'absolute';
            element.style.bottom = '20%';
            element.style.padding = '12px 6px';
            element.style.border = '5px solid #fff';
            element.style.borderRadius = '20px';
            element.style.background = 'rgba(255,255,255,0.15)';
            element.style.color = '#ffffff';
            element.style.font = 'normal 13px sans-serif';
            element.style.textAlign = 'center';
            element.style.opacity = '0.7';
            element.style.outline = 'none';
            element.style.zIndex = '999';
        }

        if ('xr' in navigator) {
            var button = document.createElement('button');
            button.style.display = 'none';

            stylizeElement(button);

            navigator.xr
                .isSessionSupported('immersive-ar')
                .then(function (supported) {
                    supported ? showStartAR() : showARNotSupported();
                })
                .catch(showARNotSupported);

            return button;
        } else {
            var message = document.createElement('a');

            if (window.isSecureContext === false) {
                message.href = document.location.href.replace(
                    /^http:/,
                    'https:'
                );
                message.innerHTML = 'WEBXR NEEDS HTTPS'; // TODO Improve message
            } else {
                message.href = 'https://immersiveweb.dev/';
                message.innerHTML = 'WEBXR NOT AVAILABLE';
            }

            message.style.left = 'calc(50% - 90px)';
            message.style.width = '180px';
            message.style.textDecoration = 'none';

            stylizeElement(message);

            return message;
        }
    },
};

export { ARButton };
