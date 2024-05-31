/* import { LightningElement, track } from 'lwc';

export default class DDT extends LightningElement {
    @track url = '/sfc/servlet.shepherd/version/renditionDownload?rendition=THUMB240BY180&versionId=0685g00000LbL1vAAF&operationContext=CHATTER&contentId=0695g00000Jt6fJAAR';
    @track showVideo = false;

    toggleVideo() {
        this.showVideo = !this.showVideo;
        this.url = 'https://vikramc9666-dev-ed.file.force.com/sfc/servlet.shepherd/version/download/0685g00000LbL1v'
    }

    get thumbnailUrl() {
        return 'URL_OF_YOUR_VIDEO_THUMBNAIL';
    }
} */

import { LightningElement, track } from 'lwc';

export default class VideoPlayer extends LightningElement {
    @track videos = [
        { id: 1, title: 'Video 1', thumbnailUrl: 'https://vikramc9666-dev-ed.file.force.com/sfc/servlet.shepherd/version/download/0685g00000LbL1v', videoUrl: 'url/to/video1.mp4' },
        { id: 2, title: 'Video 2', thumbnailUrl: 'https://vikramc9666-dev-ed.file.force.com/sfc/servlet.shepherd/version/download/0685g00000LbL20', videoUrl: 'url/to/video2.mp4' },
        // Add more videos as needed
    ];

    @track selectedVideoUrl = 'https://vikramc9666-dev-ed.file.force.com/sfc/servlet.shepherd/version/download/0685g00000LbL1v';
    @track selectedVideoTitle = '';

    playVideo(event) {
    const selectedVideoId = event.currentTarget.dataset.id;
    console.log('selectedVideoId ==> ' + selectedVideoId)
    const selectedVideo = this.videos.find(video => video.id === parseInt(selectedVideoId));
    this.selectedVideoUrl = selectedVideo.thumbnailUrl; // Use videoUrl instead of thumbnailUrl
    this.selectedVideoTitle = selectedVideo.title;
}

}