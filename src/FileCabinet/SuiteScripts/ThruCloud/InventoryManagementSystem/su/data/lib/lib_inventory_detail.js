/**
 * @NApiVersion 2.1
 */
define([],

    () => {

        const PUBLIC = {}
        const PRIVATE = {}
        PRIVATE.formatDate = (dateStr) => {
            const [year, month, day] = dateStr.split('-')
            return `${month}/${day}/${year}`
        }
        PUBLIC.setInventoryDetail = (options) => {
            const { inventoryDetails, subRecord, isPositiveInvDetail } = options
            let intInvDetailLine = 0
            for (const inventoryDetailEl of inventoryDetails) {
                log.debug('setInventoryDetail | options ', options)
                subRecord.selectLine({
                    sublistId: 'inventoryassignment',
                    line: intInvDetailLine
                })
                if (isPositiveInvDetail) {
                    subRecord.setCurrentSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'receiptinventorynumber',
                        value: inventoryDetailEl.lotnumber
                    })
                    subRecord.setCurrentSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'expirationdate',
                        value: new Date(PRIVATE.formatDate(inventoryDetailEl.expirationDate))
                    })
                    log.debug('inventoryDetailEl.quantity', inventoryDetailEl.quantity)
                } else {
                    subRecord.setCurrentSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'issueinventorynumber',
                        value: inventoryDetailEl.id
                    })
                    inventoryDetailEl.quantity = (-Math.abs(inventoryDetailEl.quantity))
                }
                subRecord.setCurrentSublistValue({
                    sublistId: 'inventoryassignment',
                    fieldId: 'quantity',
                    value: parseFloat(inventoryDetailEl.quantity)
                })
                subRecord.commitLine({
                    sublistId: 'inventoryassignment',
                    line: intInvDetailLine
                })
                intInvDetailLine++
            }


        }


        return PUBLIC
    })