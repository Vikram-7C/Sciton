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

const PAGE_SIZE = 10; // Number of records per page

export default class SciExpTicketRaise extends LightningElement {
    @track cases = [];
    columns = COLUMNS;
    isModalOpen = false;
    wiredCasesResult;
    @track selectedCaseId;
    @track caseOpen = false;
    @track currentPage = 1;
    @track totalPages = 0;

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
            this.totalPages = Math.ceil(this.cases.length / PAGE_SIZE);
        } else if (result.error) {
            this.cases = undefined;
            console.error('Error retrieving cases', result.error);
        }
    }

    get paginatedCases() {
        const start = (this.currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        return this.cases.slice(start, end);
    }

    handleOpenModal() {
        this.isModalOpen = true;
    }

    handleCloseModal() {
        this.isModalOpen = false;
        this.caseOpen = false;
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

    openModal(event) {
        this.selectedCaseId = event.currentTarget.dataset.id;
        this.caseOpen = true;
    }

    closeModal() {
        this.caseOpen = false;
    }

    getCaseUrl(caseId) {
        return `/lightning/r/Case/${caseId}/view`;
    }

    handlePreviousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }

    handleNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
        }
    }

    get isPreviousButtonDisabled() {
        return this.currentPage === 1;
    }

    get isNextButtonDisabled() {
        return this.currentPage === this.totalPages;
    }
}