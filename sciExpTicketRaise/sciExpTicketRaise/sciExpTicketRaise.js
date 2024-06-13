import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getAccountCases from '@salesforce/apex/SciExpCaseController.fetchCaseRecords';
import Id from '@salesforce/user/Id';

const COLUMNS = [
    { label: 'Case Number', fieldName: 'CaseNumber', type: 'text' },
    { label: 'Subject', fieldName: 'Subject', type:'text' },
    { label: 'Account Name', fieldName: 'AccountName', type: 'text' },
    { label: 'Priority', fieldName: 'Priority', type: 'text' },
    { label: 'Status', fieldName: 'Status', type: 'text' }
];

export default class SciExpTicketRaise extends LightningElement {
    @track cases;
    columns = COLUMNS;
    isModalOpen = false;
    wiredCasesResult;

    @wire(getAccountCases, { userId: Id })
    wiredCases(result) {
        this.wiredCasesResult = result;
        if (result.data) {
            this.cases = result.data.map(caseRecord => {
                return {
                    ...caseRecord,
                    AccountName: caseRecord.Account ? caseRecord.Account.Name : ''
                };
            });
        } else if (result.error) {
            this.cases = undefined;
            console.error('Error retrieving cases', result.error);
        }
    }

    handleOpenModal() {
        this.isModalOpen = true;
    }

    handleCloseModal() {
        this.isModalOpen = false;
    }

    handleSubmit() {
        this.template.querySelector('lightning-record-edit-form').submit();
    }

    handleSuccess(event) {
        const evt = new ShowToastEvent({
            title: "Case created",
            message: "Record ID: " + event.detail.id,
            variant: "success",
        });
        this.dispatchEvent(evt);
        this.handleCloseModal();
        return refreshApex(this.wiredCasesResult);
    }

    handleRefresh() {
        return refreshApex(this.wiredCasesResult);
    }
}