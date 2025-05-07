import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import saveOpportunityAndImageData from '@salesforce/apex/sciImageUploadCtrl.saveOpportunityAndImageData';
import { getRecord } from 'lightning/uiRecordApi';
import fillAllTheFields from '@salesforce/label/c.Fill_all_the_fields';
import selectPhoto from '@salesforce/label/c.Select_Photo';
import detailsSaved from '@salesforce/label/c.Details_Saved';
import errorInRetrievingOpp from '@salesforce/label/c.Error_in_Retrieving_Opp';
import oppLoadFailed from '@salesforce/label/c.OppLoadFailed';
import errorInImageCapture from '@salesforce/label/c.ErrorInImageCapture';
import fileUploadFailed from '@salesforce/label/c.FileUploadFailed';
import errorInAccessingCamera from '@salesforce/label/c.ErrorInAccessingCamera';
import selectOneField from '@salesforce/label/c.SelectOneField';
import Process_Invalid from '@salesforce/label/c.ProcessInvalid';
import { NavigationMixin } from 'lightning/navigation';

const FIELDS = ['Opportunity.Type_of_Order__c', 'Opportunity.StageName', 'Opportunity.NoOfPulses__c', 'Opportunity.NoOfDaysPulse__c', 'Opportunity.Packaged_Date__c'];

export default class sciOppImageUpload extends NavigationMixin(LightningElement) {
    @api recordId;
    imageSrc = null;
    noOfPulses;
    noOfDays;
    packagedDate = new Date().toISOString().split('T')[0];
    fileName;
    isDesktop = !/Mobi|Android/i.test(navigator.userAgent);
    isValidOpportunity = false;
    showError = false;
    formatts = ".png, .jpg, .jpeg, .pdf";
    canvasElement;
    processInvalid = Process_Invalid;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredOpportunity({ error, data }) {
        try {
            if (data) {
                const type = data.fields.Type_of_Order__c?.value;
                const stage = data.fields.StageName?.value;
                this.isValidOpportunity = type === 'Upgrade' && stage === 'Booked';
                this.showError = !this.isValidOpportunity;
                if (data.fields.NoOfPulses__c?.value != null) {
                    this.noOfPulses = data.fields.NoOfPulses__c?.value;
                }
                if (data.fields.NoOfDaysPulse__c?.value != null) {
                    this.noOfDays = data.fields.NoOfDaysPulse__c?.value;
                }
            } else if (error) {
                const errorMessage = error.body?.message || error.message || oppLoadFailed;
                this.showToast('Error', errorMessage, 'error');
            }
        } catch (error) {
            const errorMessage = error.body?.message || error.message || errorInRetrievingOpp;
            this.showToast('Error', errorMessage, 'error');
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
            const errorMessage = err.body?.message || err.message || errorInImageCapture;
            this.showToast('Error', errorMessage, 'error');
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
        } catch (error) {
            const errorMessage = error.body?.message || error.message || fileUploadFailed;
            this.showToast('Error', errorMessage, 'error');
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
        } catch (error) {
            const errorMessage = error.body?.message || error.message || 'Error in Field Change';
            this.showToast('Error', errorMessage, 'error');
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
            const errorMessage = error.body?.message || error.message || errorInAccessingCamera;
            this.showToast('Error', errorMessage, 'error');
        }
    }

    handleFieldChange(event) {
        try {
            const field = event.target.dataset.field;
            this[field] = event.target.value;
        } catch (err) {
            this.showToast('Error', 'Error in Field Change', 'error');
        }
    }

    handleSave() {
        try {
            let packagedDateInput = this.template.querySelector('lightning-input[data-field="packagedDate"]');
            let noOfPulsesInput = this.template.querySelector('lightning-input[data-field="noOfPulses"]');
            let noOfDaysInput = this.template.querySelector('lightning-input[data-field="noOfDays"]');

            let isValid = true;

            if (!packagedDateInput.value) {
                packagedDateInput.setCustomValidity('This field is required');
                isValid = false;
            } else {
                packagedDateInput.setCustomValidity('');
            }
            packagedDateInput.reportValidity();

            if (!noOfPulsesInput.value && !noOfDaysInput.value) {
                noOfPulsesInput.setCustomValidity(selectOneField);
                noOfDaysInput.setCustomValidity(selectOneField);
                isValid = false;
            } else {
                noOfPulsesInput.setCustomValidity('');
                noOfDaysInput.setCustomValidity('');
            }
            noOfPulsesInput.reportValidity();
            noOfDaysInput.reportValidity();

            if (!isValid) {
                this.showToast('Error', fillAllTheFields, 'error');
                return;
            }

            if (!this.imageSrc) {
                this.showToast('Error', selectPhoto, 'error');
                return;
            }

            let opportunityData = {
                Id: this.recordId,
                Packaged_Date__c: this.packagedDate
            };

            if (this.noOfPulses != null) {
                opportunityData.NoOfPulses__c = this.noOfPulses;
            }
            if (this.noOfDays != null) {
                opportunityData.NoOfDaysPulse__c = this.noOfDays;
            }

            saveOpportunityAndImageData({
                oppDetails: opportunityData,
                base64Data: this.imageSrc.split(',')[1],
                fileName: this.fileName || 'CapturedImage.png'
            })
                .then(() => {
                    this.showToast('Success', detailsSaved, 'success');
                    this.handleClose();
                })
                .catch((error) => {
                    const errorMessage = error.body?.message || error.message || 'Save failed.';
                    this.showToast('Error', errorMessage, 'error');
                });

        } catch (err) {
            this.showToast('Error', 'Unexpected error occurred.', 'error');
        }
    }


    handleClear() {
        try {
            this.imageSrc = null;
        } catch (error) {
            const errorMessage = error.body?.message || error.message || 'Error in Clearing Data';
            this.showToast('Error', errorMessage, 'error');
        }
    }

    handleClose() {
        try {
            if (this.isDesktop) {
                this.dispatchEvent(new CloseActionScreenEvent());
            } else {
                const recordUrl = `/lightning/r/${this.recordId}/view`;
                window.location.href = recordUrl;
                this.dispatchEvent(new CloseActionScreenEvent());
                this.imageSrc = null;
            }
        } catch (error) {
            const errorMessage = error.body?.message || error.message || 'Popup Closing Error ';
            this.showToast('Error', errorMessage, 'error');
        }
    }

    showToast(title, message, variant) {
        try {
            this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
        } catch (error) {
            const errorMessage = error.body?.message || error.message || 'Error in Displaying Toast';
            this.showToast('Error', errorMessage, 'error');
        }
    }
}