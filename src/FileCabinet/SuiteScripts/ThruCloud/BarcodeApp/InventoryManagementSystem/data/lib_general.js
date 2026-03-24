/**
 * @NApiVersion 2.1
 */
define(['N/query'],
    /**
 * @param{query} query
 */
    (query) => {

        const PUBLIC = {}
        PUBLIC.uomandlocation = (options) => {
            if (!options) options = {
                parentUom: false,
                subsidiary: false
            }
            log.debug('uomandlocation | options', options)
            const strQuery = `SELECT
                    unitsTypeUom.internalid as id,
                    unitsTypeUom.unitsType,
                    unitsTypeUom.unitname as name,
                FROM unitsTypeUom
                ${options.parentUom ? `WHERE unitsTypeUom.unitsType = ${options.parentUom}` : ''}`
            log.debug('strQuery', strQuery)
            const arrUomResult = query.runSuiteQL({ query: strQuery }).asMappedResults()

            const strLocationQuery = `SELECT
                    location.id as id,
                    BUILTIN.DF(location.id) as name,
                    location.subsidiary
                FROM location
                ${options.subsidiary ?
                    `JOIN LocationSubsidiaryMap
                    ON location.id = LocationSubsidiaryMap.location
                    AND LocationSubsidiaryMap.subsidiary = ${options.subsidiary}` : ''
                }
                WHERE location.isinactive = 'F'`
            log.debug('strLocationQuery', strLocationQuery)
            const arrLocationResult = query.runSuiteQL({ query: strLocationQuery }).asMappedResults()

            const strInvAdjReasonQuery = `SELECT
                id, name
                FROM customlist_tc_ims_reason_inv_adjust
                WHERE isinactive ='F'`
            const arrInvAdjReasonResult = query.runSuiteQL({ query: strInvAdjReasonQuery }).asMappedResults()

            return {
                uomSelect: arrUomResult,
                locationSelect: arrLocationResult,
                invAdjReason: arrInvAdjReasonResult
            }
        }
        PUBLIC.getUser = (options) => {
            log.debug('getUser', options)
            const objOutput = {}
            const strQuery = `SELECT
                    employee.id,
                    employee.subsidiary
                FROM employee
                WHERE employee.id = ${options.currentUserId}`
            log.debug('strQuery', strQuery)
            const objUser = query.runSuiteQL({ query: strQuery }).asMappedResults()[0]
            objOutput.currentUser = objUser
            return objOutput
        }


        PUBLIC.getInventoryDetail = (options) => {

            log.debug('getInventoryDetail', options)

            const objOutput = {}
            const strQuery = `SELECT 
                inventoryNumber.id,
                inventoryNumber.inventorynumber as lotnumber,
                inventorynumber.expirationdate as expirationDate,
                InventoryNumberLocation.quantityavailable as max_quantity, 
                FROM inventoryNumber
                JOIN InventoryNumberLocation
                    ON inventoryNumber.id = InventoryNumberLocation.inventorynumber
                WHERE
                    inventoryNumber.item = ${options.item}
                AND InventoryNumberLocation.location = ${options.location}`
            log.debug('strQuery', strQuery)
            const arrInventoryDetails = query.runSuiteQL({ query: strQuery }).asMappedResults()
            objOutput.inventoryDetails = arrInventoryDetails
            return objOutput
        }
        return PUBLIC
    })