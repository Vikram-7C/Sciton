import { LightningElement, track, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import saveOpportunityAndImageData from '@salesforce/apex/ImageUploadController.saveOpportunityAndImageData';
import { getRecord } from 'lightning/uiRecordApi';

const FIELDS = ['Opportunity.Type_of_Order__c', 'Opportunity.StageName'];

export default class OppImageUpload extends LightningElement {
    @api recordId;

    @track imageSrc = null;
    @track noOfPulses;
    @track noOfDays;
    @track packagedDate = new Date().toISOString().split('T')[0];
    @track fileName;
    @track isDesktop = !/Mobi|Android/i.test(navigator.userAgent);
    @track isValidOpportunity = false;
    @track showError = false;

    canvasElement;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredOpportunity({ error, data }) {
        try {
            if (data) {
                const type = data.fields.Type_of_Order__c?.value;
                const stage = data.fields.StageName?.value;
                this.isValidOpportunity = type === 'Upgrade' && stage === 'Booked';
                this.showError = !this.isValidOpportunity;
            } else if (error) {
                this.showToast('Error', 'Failed to load Opportunity data.', 'error');
            }
        } catch (err) {
            this.showToast('Error', 'Error in Retriving Opportunity', 'error');
        }
    }

    renderedCallback() {
        if (!this.canvasElement) {
            this.canvasElement = this.template.querySelector('.canvas');
        }
    }

    handleTakePhoto() {
        try {
            if (!this.isDesktop) {
                this.template.querySelector('#cameraInput').click();
            } else {
                this.captureDesktopPhoto();
            }
        } catch (err) {
            this.showToast('Error', 'Error in Capturing Image', 'error');
        }
    }

    handleFileUpload(event) {
        try {
            const file = event.target.files[0];
            if (file) {
                this.fileName = file.name;
                const reader = new FileReader();
                reader.onload = () => {
                    this.imageSrc = reader.result;
                };
                reader.readAsDataURL(file);
            }
        } catch (err) {
             this.showToast('Error', 'Error in File Upload', 'error');
        }
    }

    handleFileChange(event) {
        try {
            const file = event.target.files[0];
            if (file) {
                this.fileName = file.name;
                const reader = new FileReader();
                reader.onload = () => {
                    this.imageSrc = reader.result;
                };
                reader.readAsDataURL(file);
            }
        } catch (err) {
            console.error('Error in handleFileChange:', err);
        }
    }

    async captureDesktopPhoto() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const video = document.createElement('video');
            video.srcObject = stream;
            await new Promise((resolve) => (video.onloadedmetadata = resolve));
            video.play();

            this.canvasElement.width = video.videoWidth;
            this.canvasElement.height = video.videoHeight;
            const context = this.canvasElement.getContext('2d');
            context.drawImage(video, 0, 0, this.canvasElement.width, this.canvasElement.height);
            this.imageSrc = this.canvasElement.toDataURL('image/png');

            stream.getTracks().forEach((track) => track.stop());
        } catch (error) {
             this.showToast('Error', 'Error in accessing camera', 'error');
        }
    }

    handleFieldChange(event) {
        try {
            const field = event.target.dataset.field;
            this[field] = event.target.value;
        } catch (err) {
            console.error('Error in handleFieldChange:', err);
            this.showToast('Error', 'Error in Field Change', 'error');
        }
    }

    handleSave() {
    try {
        const inputs = this.template.querySelectorAll('lightning-input[data-required="true"]');
        let isValid = true;

        inputs.forEach((input) => {
            if (!input.value) {
                input.setCustomValidity('This field is required');
                isValid = false;
            } else {
                input.setCustomValidity('');
            }
            input.reportValidity();
        });

        if (!isValid) {
            this.showToast('Error', 'Please fill in all required fields.', 'error');
            return;
        }

        if (!this.imageSrc) {
            this.showToast('Error', 'Please take a photo or upload an image.', 'error');
            return;
        }

        saveOpportunityAndImageData({
            recordId: this.recordId,
            noOfPulses: this.noOfPulses,
            noOfDays: this.noOfDays,
            packagedDate: this.packagedDate,
            base64Data: this.imageSrc.split(',')[1],
            fileName: this.fileName || 'CapturedImage.png'
        })
            .then(() => {
                this.showToast('Success', 'Data saved successfully!', 'success');
                this.handleClose();
            })
            .catch((error) => {
                this.showToast('Error', 'Save failed.', 'error');
            });

    } catch (err) {
        console.error('Unexpected error during save:', err);
        this.showToast('Error', 'Unexpected error occurred.', 'error');
    }
}


    handleClear() {
        try {
            this.imageSrc = null;
        } catch (err) {
            this.showToast('Error', 'Error in Clearing Data', 'error');
        }
    }

    handleClose() {
        try {
            this.dispatchEvent(new CloseActionScreenEvent());
        } catch (err) {
            this.showToast('Error', 'Modal Popup Closing Error', 'error');
        }
    }

    showToast(title, message, variant) {
        try {
            this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
        } catch (err) {
            this.showToast('Error', 'Error in Displaying Toast', 'error');
        }
    }
}