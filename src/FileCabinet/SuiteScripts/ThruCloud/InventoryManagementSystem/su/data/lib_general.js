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
        return PUBLIC
    })