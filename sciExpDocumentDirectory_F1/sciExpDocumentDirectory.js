import { LightningElement, track, wire } from 'lwc';
import getDocumentDirectoryHierarchy from '@salesforce/apex/SciExpDocumentDirectoryCtrl.getDocumentDirectoryHierarchy';
import getRelatedNotesAndAttachments from '@salesforce/apex/SciExpDocumentDirectoryCtrl.getRelatedNotesAndAttachments';
import getSearchFiles from '@salesforce/apex/SciExpDocumentDirectoryCtrl.getSearchFiles';
import getThumbnails from '@salesforce/apex/SciExpDocumentDirectoryCtrl.getThumbnails';

import { NavigationMixin } from 'lightning/navigation';

export default class SciExpDocumentDirectory extends NavigationMixin(LightningElement) {
    @track searchTerm = '';
    @track treeData;
    @track filteredTreeData;
    @track selectedNode;
    @track relatedFiles = [];
    @track filteredRelatedFiles = [];
    @track filteredRelatedVideos = [];
    @track showRelatedFiles = false;
    @track imageURL = [];
    @track selectedVideo;

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
            this.selectedNode = null;
            this.selectedVideo = null;
        } else {
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

                this.filteredRelatedVideos = videos.map(obj => ({
                    ...obj,
                    url: `https://sciton--expdev.sandbox.file.force.com/sfc/servlet.shepherd/version/download/${obj.VersionDataUrl.split("/").pop()}`
                }));
                this.filteredRelatedFiles = nonVideos;

                this.showRelatedFiles = true;
                this.handlefileThumbnail(this.filteredRelatedFiles);
            })
            .catch(error => {
                console.error('Error fetching related files:', error);
            });
    }

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

                const videos = this.relatedFiles.filter(file => file.ContentDocument.FileType === 'MP4');
                const nonVideos = this.relatedFiles.filter(file => file.ContentDocument.FileType !== 'MP4');

                this.filteredRelatedVideos = videos.map(obj => ({
                    ...obj,
                    url: `https://sciton--expdev.sandbox.file.force.com/sfc/servlet.shepherd/version/download/${obj.VersionDataUrl.split("/").pop()}`
                }));
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
            this.imageURL = result.map(contentVersion => ({
                id: contentVersion.ContentDocumentId,
                title: contentVersion.ContentDocument.Title,
                cvid: contentVersion.Id,
                url: `/sfc/servlet.shepherd/version/renditionDownload?rendition=THUMB240BY180&versionId=${contentVersion.Id}&operationContext=CHATTER&contentId=${contentVersion.ContentDocumentId}`,
                iconName: this.getFileIcon(contentVersion.ContentDocument.FileType),
                thumbnail: `https://sciton--expdev.sandbox.file.force.com/sfc/servlet.shepherd/version/download/${contentVersion.VersionDataUrl.split("/").pop()}`,
                itemFileType: contentVersion.ContentDocument.FileType !== 'PDF'
            }));
        })
        .catch(error => {
            console.error('Error fetching thumbnails:', error);
        });
    }
       


getFileIcon(fileType) {
    console.log('file type ==> '+fileType);
    switch (fileType) {
        case 'PDF':
            return 'doctype:pdf';
        case 'PNG':
        case 'JPG':
        case 'JPEG':
            return 'doctype:image';
        case 'DOC':
        case 'DOCX':
            return 'doctype:word';
        case 'XLS':
        case 'XLSX':
            return 'doctype:excel';
        case 'PPT':
        case 'PPTX':
            return 'doctype:ppt';
        default:
            return 'doctype:unknown';
        
    }
}


    previewFile(event) {
        const recordId = event.currentTarget.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__namedPage',
            attributes: {
                pageName: 'filePreview'
            },
            state: {
                selectedRecordId: recordId
            }
        });
    }

    playVideo(event) {
        const selectedId = event.currentTarget.dataset.id;
        const selectedVideo = this.filteredRelatedVideos.find(video => video.Id === selectedId);
        if (selectedVideo) {
            this.selectedVideo = selectedVideo;
        } else {
            console.error('Selected video not found.');
        }
    }

    downloadFile(event) {
        const recordId = event.currentTarget.dataset.id;
        const fileUrl = `/sfc/servlet.shepherd/document/download/${recordId}`;
        const anchor = document.createElement('a');
        anchor.href = fileUrl;
        anchor.download = ''; 
        document.body.appendChild(anchor);   
        anchor.click();  
        document.body.removeChild(anchor);
    }
}