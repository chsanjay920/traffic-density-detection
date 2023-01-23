import { Component, OnInit,Input } from '@angular/core';
import { ElementRef, ViewChild } from '@angular/core';
import * as cocoSSD from '@tensorflow-models/coco-ssd';
import { HttpClient } from '@angular/common/http';
import { DataToPredection } from '../model/data-to-predection';

@Component({
  selector: 'app-canvas-video',
  templateUrl: './canvas-video.component.html',
  styleUrls: ['./canvas-video.component.css'],
})
export class CanvasVideoComponent implements OnInit {
  @Input() StreamData!:DataToPredection;

  private video: any;
  public Owidth: any;
  public Oheight: any;
  @ViewChild('canvas') c!: ElementRef;
  @ViewChild('video') v!: ElementRef;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {}
  async startplaying() {
    await this.video_init();
  }
  async getVideo(path: string) {
    const videoBlobe = this.http
      .get(path, { responseType: 'blob' })
      .toPromise();
    const Url = URL.createObjectURL((await videoBlobe) as Blob);
    return Url;
  }
  async video_init() {
    this.video = this.v.nativeElement;
    this.video.src = await this.getVideo(this.StreamData.videoPath);
    this.video.onloadeddata = async () => {
      this.video.play();
    };
    this.video.addEventListener(
      'loadedmetadata',
      (e: any) => {
        this.Owidth = this.video.videoWidth;
        this.Oheight = this.video.videoHeight;
        console.log(this.Owidth, this.Oheight, ' pixels ');
      },
      false
    );
    await this.predictWithCocoModel();
  }

  public async predictWithCocoModel() {
    const model = await cocoSSD.load({ base: 'lite_mobilenet_v2' });
    this.detectFrame(this.video, model);
  }

  detectFrame = (video: any, model: cocoSSD.ObjectDetection) => {
    model.detect(video).then((predictions: any[]) => {
      console.log(predictions);
      this.renderPredictions(predictions);
      requestAnimationFrame(() => {
        this.detectFrame(video, model);
      });
    });
  };

  renderPredictions = async (predictions: any[]) => {
    const canvas = this.c.nativeElement;
    canvas.width = 800;
    canvas.height = 500;
    let ctx: CanvasRenderingContext2D;
    if (!(ctx = canvas.getContext('2d'))) {
      throw new Error(`2d context not supported or canvas already initialized`);
    }
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const font = '16px sans-serif';
    ctx.font = font;
    ctx.textBaseline = 'top';
    ctx.drawImage(this.video, 0, 0, 800, 500);

    predictions.forEach((prediction) => {
      const x = prediction.bbox[0] / (this.Owidth / 800);
      const y = prediction.bbox[1] / (this.Oheight / 500);
      const width = prediction.bbox[2] / (this.Owidth / 800);
      const height = prediction.bbox[3] / (this.Oheight / 500);
      // Draw the bounding box.
      ctx.strokeStyle = '#99ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      // Draw the label background.
      ctx.fillStyle = '#99ff00';
      const textWidth = ctx.measureText(prediction.class).width;
      const textHeight = parseInt(font, 10); // base 10
      ctx.fillRect(x, y, textWidth + 4, textHeight + 4);
    });
    predictions.forEach((prediction) => {
      const x = prediction.bbox[0] / (this.Owidth / 800);
      const y = prediction.bbox[1] / (this.Oheight / 500);
      // Draw the text last to ensure it's on top.
      ctx.fillStyle = '#000000';
      ctx.fillText(prediction.class, x, y);
    });
  };
}
