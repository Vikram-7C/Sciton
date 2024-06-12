import { LightningElement, track, wire } from 'lwc';
import getDocumentDirectoryHierarchy from '@salesforce/apex/SciExpDocumentDirectoryCtrl.getDocumentDirectoryHierarchy';
import getRelatedNotesAndAttachments from '@salesforce/apex/SciExpDocumentDirectoryCtrl.getRelatedNotesAndAttachments';
import getSearchFiles from '@salesforce/apex/SciExpDocumentDirectoryCtrl.getSearchFiles';
//import getVideoContentVersions from '@salesforce/apex/SciExpDocumentDirectoryCtrl.getVideoContentVersions';
import getThumbnails from '@salesforce/apex/SciExpDocumentDirectoryCtrl.getThumbnails';

import { NavigationMixin } from 'lightning/navigation';

export default class sciExpDocumentDirectory extends NavigationMixin(LightningElement) {
    @track searchTerm = '';
    @track treeData;
    @track filteredTreeData;
    @track selectedNode;
    @track relatedFiles = [];
    @track filteredRelatedFiles = [];
    @track filteredRelatedVideos = [];
    @track showRelatedFiles = false;
    @track imageURL = [];
    @track selectedVideo


    @wire(getDocumentDirectoryHierarchy)
    wiredData({ error, data }) {
        if (data) {
            this.treeData = this.processData(data);
            this.filteredTreeData = this.treeData;
            console.log('filteredTreeData', JSON.parse(JSON.stringify(this.filteredTreeData)))
        } else if (error) {
            console.error('Error fetching document directory hierarchy:', error);
        }
    }

    processData(data) {
        return data.map(node => ({
            label: node.name,
            name: node.id,
            expanded: true,
            items: this.processData(node.children)
        }));
    }

    handleNodeSelect(event) {
    const selectedNodeId = event.detail.name;
    if (selectedNodeId === this.selectedNode) {
        // If the same node is clicked again, reset selectedVideo to null
        this.selectedNode = null;
        this.selectedVideo = null;
    } else {
        // If a different node is selected, update selectedNode and reset selectedVideo
        this.selectedNode = selectedNodeId;
        this.selectedVideo = null;
    }
    if (this.selectedNode) {
        this.loadRelatedFilesForRecord(this.selectedNode);
    } else {
        this.showRelatedFiles = false;
        this.relatedFiles = [];
    }
}

    loadRelatedFilesForRecord(recordId) {
        getRelatedNotesAndAttachments({ recordId: recordId })
            .then(result => {
                this.relatedFiles = result;
                console.log('Related Files:', this.relatedFiles);
                const videos = this.relatedFiles.filter(file => file.ContentDocument.FileType === 'MP4');
                const nonVideos = this.relatedFiles.filter(file => file.ContentDocument.FileType !== 'MP4');

                this.filteredRelatedVideos = videos.map(obj => {
                    return {
                        ...obj, // Copy all properties from obj
                        url: 'https://sciton--expdev.sandbox.file.force.com/sfc/servlet.shepherd/version/download/' + obj.VersionDataUrl.split("/").pop()
                    };
                });
                this.filteredRelatedFiles = nonVideos;

                this.showRelatedFiles = true;
                this.handlefileThumbnail(this.filteredRelatedFiles);
            })
            .catch(error => {
                console.error('Error fetching related files:', error);
            });
    }

    /* get videoUrl() {
        if (this.filteredRelatedVideos && this.filteredRelatedVideos.length > 0) {
            return this.filteredRelatedVideos[0];
        }
        return '';
    } */


    handleSearch(event) {
        this.relatedFiles = [];
        this.searchTerm = event.target.value.toLowerCase();
        this.selectedNode = event.target.value.toLowerCase();

        getSearchFiles({ searchTerm: this.searchTerm })
            .then(result => {
                const uniqueFilesMap = new Map();
                for (let file of result) {
                    uniqueFilesMap.set(file.ContentDocumentId, file);
                }

                this.relatedFiles = Array.from(uniqueFilesMap.values());
                //this.relatedFiles = result

                const videos = this.relatedFiles.filter(file => file.ContentDocument.FileType === 'MP4');
                const nonVideos = this.relatedFiles.filter(file => file.ContentDocument.FileType !== 'MP4');

                this.filteredRelatedVideos = videos.map(obj => {
                    return {
                        ...obj, // Copy all properties from obj
                        url: 'https://sciton--expdev.sandbox.file.force.com/sfc/servlet.shepherd/version/download/' + obj.VersionDataUrl.split("/").pop()
                    };
                });
                this.filteredRelatedFiles = nonVideos;

                this.showRelatedFiles = true;
                this.handlefileThumbnail(this.filteredRelatedFiles);
            })
            .catch(error => {
                console.error('Error fetching related files:', error);
            });

        this.filterItems();
    }

    filterItems() {
        if (this.treeData) {
            const clonedTreeData = JSON.parse(JSON.stringify(this.treeData));
            this.filteredTreeData = clonedTreeData.filter(item => this.filterRecursive(item));
        }

        if (this.searchTerm) {
            this.filteredRelatedFiles = this.relatedFiles.filter(file =>
                file.ContentDocument.FileType !== 'MP4' && file.ContentDocument.Title.toLowerCase().includes(this.searchTerm)
            );

            this.filteredRelatedVideos = this.relatedFiles.filter(file =>
                file.ContentDocument.FileType === 'MP4' && file.ContentDocument.Title.toLowerCase().includes(this.searchTerm)
            );
        } else {
            this.filteredRelatedFiles = this.relatedFiles.filter(file =>
                file.ContentDocument.FileType !== 'MP4'
            );

            this.filteredRelatedVideos = this.relatedFiles.filter(file =>
                file.ContentDocument.FileType === 'MP4'
            );
        }
    }

    filterRecursive(item) {
        if (item.items) {
            const filteredChildren = item.items.filter(child => this.filterRecursive(child));
            if (filteredChildren.length > 0) {
                item.items = filteredChildren;
                return true;
            } else {
                return item.label.toLowerCase().includes(this.searchTerm);
            }
        }
        return item.label.toLowerCase().includes(this.searchTerm);
    }

    handlefileThumbnail(relatedFiles) {
        this.imageURL = [];
        getThumbnails({ CDL: relatedFiles })
            .then(result => {
                for (let i = 0; i < result.length; i++) {
                    console.log('Inside loop starting ')
                    const contentVersion = result[i];
                    const rec = {
                        id: contentVersion.ContentDocumentId,
                        title: contentVersion.ContentDocument.Title,
                        cvid: contentVersion.Id,
                        url: '/sfc/servlet.shepherd/version/' +
                            'renditionDownload?rendition=' +
                            'THUMB240BY180&versionId=' +
                            contentVersion.Id +
                            '&operationContext=CHATTER&contentId=' +
                            contentVersion.ContentDocumentId
                    }
                    console.log(rec.id);
                    console.log(rec.title);
                    console.log(rec.cvid);
                    console.log(rec.url);

                    this.imageURL.push(rec);

                    console.log('Exit loop');
                }
                console.log('imagre URL size =>' + this.imageURL.length);
            })

            .catch(error => {
                console.error('Error Thumbnails:', error);
            })
    }

    previewVideo(event) {
    const selectedId = event.currentTarget.dataset.id;
    console.log('Selected Video id ==> ' + selectedId)
    if (this.filteredRelatedVideos && this.filteredRelatedVideos.length > 0) {
        console.log('filtered Related Video size ==> '+this.filteredRelatedVideos.length);
        // Find the selected video based on the ID
        const selectedVideo = this.filteredRelatedVideos.find(video => video.Id === selectedId);
        // If a video is found, assign it to selectedVideo
        if (selectedVideo) {
            this.selectedVideo = selectedVideo;
            console.log('selectedVideo  ===> ', this.selectedVideo);
        } else {
            console.error('Selected video not found.');
        }
    }
}


    previewFile(event) {
        console.log('ID from currentTarget dataset:', event.currentTarget.dataset.id);
        this[NavigationMixin.Navigate]({
            type: 'standard__namedPage',
            attributes: {
                pageName: 'filePreview'
            },
            state: {
                selectedRecordId: event.currentTarget.dataset.id
            }
        })
    }


    playVideo(event) {
    const selectedId = event.currentTarget.dataset.id;
    if (this.filteredRelatedVideos && this.filteredRelatedVideos.length > 0) {
        // Find the selected video based on the ID
        const selectedVideo = this.filteredRelatedVideos.find(video => video.Id === selectedId);
        // If a video is found, assign it to selectedVideo
        if (selectedVideo) {
            this.selectedVideo = selectedVideo;
        } else {
            console.error('Selected video not found.');
        }
    }
}
}