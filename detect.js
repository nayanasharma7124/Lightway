class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      cameraDevices: [], // List of available camera devices
      selectedCamera: null, // Currently selected camera device
      lastSpokenClass: null, // Last spoken prediction class
    };
    this.videoRef = React.createRef();
    this.canvasRef = React.createRef();
  }

  styles = {
    position: 'absolute',
  };

  detectFromVideoFrame = (model, video) => {
    model.detect(video).then(predictions => {
      this.showDetections(predictions);
      this.voicePredictions(predictions);

      requestAnimationFrame(() => {
        this.detectFromVideoFrame(model, video);
      });
    }, (error) => {
      console.log("Couldn't start the webcam");
      console.error(error);
    });
  };

  showDetections = predictions => {
    const ctx = this.canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const font = "40px helvetica";
    ctx.font = font;
    ctx.textBaseline = "top";

    predictions.forEach(prediction => {
      const x = prediction.bbox[0];
      const y = prediction.bbox[1];
      const width = prediction.bbox[2];
      const height = prediction.bbox[3];
      // Draw the bounding box.
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      // Draw the label background.
      ctx.fillStyle = "#000";
      const textWidth = ctx.measureText(prediction.class).width;
      const textHeight = parseInt(font, 10);
      // draw top left rectangle
      ctx.fillRect(x, y, textWidth + 10, textHeight + 10);
      // draw bottom left rectangle
      ctx.fillRect(x, y + height - textHeight, textWidth + 15, textHeight + 10);

      // Draw the text last to ensure it's on top.
      ctx.fillStyle = "#fff";
      ctx.fillText(prediction.class, x, y);
      ctx.fillText(prediction.score.toFixed(2), x, y + height - textHeight);
    });
  };

  voicePredictions = predictions => {
    const synth = window.speechSynthesis;
    const currentPrediction = predictions.length > 0 ? predictions[0].class : null;

    if (currentPrediction && currentPrediction !== this.state.lastSpokenClass) {
      const text = `${currentPrediction} with confidence ${predictions[0].score.toFixed(2)}`;
      const utterance = new SpeechSynthesisUtterance(text);
      synth.speak(utterance);
      this.setState({ lastSpokenClass: currentPrediction });
    }
  };

  componentDidMount() {
    if (navigator.mediaDevices.getUserMedia || navigator.mediaDevices.webkitGetUserMedia) {
      const webcamPromise = navigator.mediaDevices
        .getUserMedia({
          video: { deviceId: this.state.selectedCamera ? { exact: this.state.selectedCamera } : undefined },
          audio: false,
        })
        .then(stream => {
          window.stream = stream;
          this.videoRef.current.srcObject = stream;

          return new Promise(resolve => {
            this.videoRef.current.onloadedmetadata = () => {
              resolve();
            };
          });
        }, (error) => {
          console.log("Couldn't start the webcam");
          console.error(error);
        });

      const enumerateDevicesPromise = navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const cameraDevices = devices.filter(device => device.kind === 'videoinput');
          this.setState({ cameraDevices });
          if (cameraDevices.length > 0) {
            this.setState({ selectedCamera: cameraDevices[0].deviceId });
          }
        })
        .catch(error => {
          console.error('Error enumerating devices:', error);
        });

      const loadlModelPromise = cocoSsd.load();
      
      Promise.all([loadlModelPromise, webcamPromise, enumerateDevicesPromise])
        .then(values => {
          this.detectFromVideoFrame(values[0], this.videoRef.current);
        })
        .catch(error => {
          console.error(error);
        });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.selectedCamera !== this.state.selectedCamera) {
      if (navigator.mediaDevices.getUserMedia || navigator.mediaDevices.webkitGetUserMedia) {
        navigator.mediaDevices
          .getUserMedia({
            video: { deviceId: { exact: this.state.selectedCamera } },
            audio: false,
          })
          .then(stream => {
            window.stream.getTracks().forEach(track => track.stop());
            window.stream = stream;
            this.videoRef.current.srcObject = stream;
          })
          .catch(error => {
            console.log("Couldn't switch the webcam");
            console.error(error);
          });
      }
    }
  }

  switchCamera = () => {
    const { selectedCamera, cameraDevices } = this.state;
    if (cameraDevices.length < 2) {
      return;
    }
    const currentIndex = cameraDevices.findIndex(device => device.deviceId === selectedCamera);
    const newIndex = (currentIndex + 1) % cameraDevices.length;
    this.setState({ selectedCamera: cameraDevices[newIndex].deviceId });
  };

  render() {
    const { selectedCamera } = this.state;
    return (
      <div className="ai-container">
        <video
          style={this.styles}
          autoPlay
          muted
          playsInline
          ref={this.videoRef}
          className="ai-vid"
          width="720"
          height="600"
        />
        <canvas style={this.styles} ref={this.canvasRef} width="720" height="650" />
        <button onClick={this.switchCamera}>Switch Camera</button>
      </div>
    );
  }
}

const domContainer = document.querySelector('#root');
ReactDOM.render(React.createElement(App), domContainer);
