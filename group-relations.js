"use strict";

function getPks(rel) {
    // So we don't repeat ourselves
    if (rel._pks === undefined)
        rel._pks = rel.items
            .filter((item) => {
                return item.isPk;
            })
            .map((item) => {
                return item.name;
            })
            .sort((nameA, nameB) => {
                return nameA.localeCompare(nameB);
            });

    return rel._pks;
}

function orderAscendingPk(rels) {
    return rels.sort((a, b) => {
        // First we will get the primary keys of A and B (sorted alphabetically)
        let aPks = getPks(a);
        let bPks = getPks(b);

        // Now we compare based on cardinality
        if (aPks.length < bPks.length)
            return -1;
        else if (aPks.length > bPks.length)
            return 1;
        else // If same cardinality, return based on alphabetical ordering of joined keys
            return aPks.join().localeCompare(bPks.join());
    });
}

// Returns 0 if identical, -1 if no similar keys, 1 if some similar keys
function comparePks(relA, relB) {
    let aPks = getPks(relA);
    let bPks = getPks(relB);

    let common = aPks.filter((pk) => {
       return bPks.includes(pk);
    });

    if (common.length === aPks.length)
        return 0; // Identical
    else if (common.length === 0)
        return -1; // No similar keys
    else
        return 1; // Some similar keys (but not all)
}

function removeFrom(arr, element) {
    let index = arr.indexOf(element);
    if (index >= 0)
        arr.splice(index, 1);
}

function group(rels) {
    let remainingRels = rels.slice(0);
    let cluster = [];
    let nes = 0;
    let orderedRels = orderAscendingPk(remainingRels.slice(0));
    cluster[nes] = [];
    cluster[nes].push(orderedRels[0]);
    removeFrom(remainingRels, orderedRels[0]);

    // Step 1 and 2
    let disjoint = true;
    for (let i = 1; i < orderedRels.length; i++) {
        // The pseudo code said to compare this ordered rel and the previous ordered rel, but that only makes sense if
        // the previous rel was added to cluster. To fix this, I added a check for disjoint, since disjoint will only
        // be true if the previous rel was added.
        if (disjoint && comparePks(orderedRels[i], orderedRels[i - 1]) === 0) {
            cluster[nes].push(orderedRels[i]);
            removeFrom(remainingRels, orderedRels[i]);
        } else {
            for (let entity of cluster) {
                for (let rel of entity) {
                    if (comparePks(orderedRels[i], rel) !== -1) {
                        disjoint = false;
                        break;
                    }
                }

                if (!disjoint)
                    break;
            }

            if (disjoint) {
                nes++;
                cluster[nes] = [];
                cluster[nes].push(orderedRels[i]);
                removeFrom(remainingRels, orderedRels[i]);
            }
        }
    }

    // Step 3
    // The pseudo-code for this one was weird, i always seemed to be 1. I tried to make sense of it, but I don't know...
    // Essentially we just want to see if this relation has at least one primary key matching an entity, and does not
    // match more than 1 entity, so that is what I wrote here.
    let removes = [];
    for (let rel of remainingRels) {
        let matchedEntity = null;
        let valid = true;

        for (let entity of cluster) {
            // See if our rel has PK that is in this entity
            let contains = false;
            for (let relB of entity) {
                if (comparePks(rel, relB) !== -1) {
                    contains = true;
                    break;
                }
            }

            if (contains) {
                if (matchedEntity === null) {
                    matchedEntity = entity;
                } else {
                    // This relation matched more than 1 entity, skip it
                    valid = false;
                    break;
                }
            }
        }

        if (valid && matchedEntity !== null) {
            matchedEntity.push(rel);
            removes.push(rel);
        }
    }

    // Remove all the elements that we wanted removed. We couldn't do it in the loop cause editing the thing you are
    // looping through causes issues.
    for (let remove of removes) {
        removeFrom(remainingRels, remove);
    }
    removes = [];

    // Step 4
    let argument = [];
    let intersects = [];
    let nas = nes + 1;
    cluster[nas] = [];
    let firstRel = true;
    for (let rel of remainingRels) {
        for (let i = 0; i <= nes; i++) {
            intersects[i] = false;
            for (let relB of cluster[i]) {
                if (comparePks(rel, relB) !== -1) {
                    intersects[i] = true;
                    break;
                }
            }
        }

        if (firstRel) {
            argument[0] = intersects.slice(0);
            cluster[nas].push(rel);
            removes.push(rel);
            firstRel = false;
        } else {
            let found = false;

            // The pseudo code said j should be 0, but I'm pretty sure it is suppose to be nes + 1. If j was 0 then we
            // would could end up going outside the argument index, and we will be pushing to the abstract entities,
            // rather than the relationships, which doesn't really make sense.
            for (let j = nes + 1; j <= nas; j++) {
                let isMatch = true;
                for (let i = 0; i < intersects.length; i++) {
                    if (intersects[i] !== argument[j - nes - 1][i]) {
                        isMatch = false;
                        break;
                    }
                }

                if (isMatch) {
                    cluster[j].push(rel);
                    removes.push(rel);
                    found = true;
                    break;
                }
            }

            if (!found) {
                argument[argument.length] = intersects.slice(0);
                nas++;
                cluster[nas] = [];
                cluster[nas].push(rel);
                removes.push(rel);
            }
        }
    }

    // Remove all the elements that we wanted removed. We couldn't do it in the loop cause editing the thing you are
    // looping through causes issues. This is kinda unnecessary here since we are done the algorithm, but w/e
    for (let remove of removes) {
        removeFrom(remainingRels, remove);
    }

    // Now we will build up the variables to be friendly for gojs and return
    let abstractEntities = cluster.slice(0, nes + 1);
    let abstractRelations = cluster.slice(nes + 1);

    // Start with schema. Keys for abstract entities/relations start with ~ to avoid overlapping with table keys
    let schema = [];

    for (let i = 0; i < abstractEntities.length; i++) {
        let key = '~E' + (i + 1);
        let title = 'Abstract Entity ' + (i + 1);
        let schemaObj = { key: key, title: title, isRelation: false, isGroup: true, items: [] };
        for (let table of abstractEntities[i]) {
            schemaObj.items.push({name: table.key, color: 'Foreign', figure: 'DividedProcess'});
            table.group = key;
        }

        schema.push(schemaObj);
    }

    for (let i = 0; i < abstractRelations.length; i++) {
        let key = '~R' + (i + 1);
        let title = 'Abstract Relation ' + (i + 1);
        let schemaObj = { key: key, title: title, isRelation: true, isGroup: true, items: [] };
        for (let table of abstractRelations[i]) {
            schemaObj.items.push({name: table.key, color: 'Primary', figure: 'DividedProcess'});
            table.group = key;
        }

        schema.push(schemaObj);
    }

    // Add tables themselves
    schema = schema.concat(rels);

    // Now do relations
    let relations = [];
    for (let i = 0; i < argument.length; i++)
        for (let j = 0; j < argument[i].length; j++)
            if (argument[i][j])
                relations.push({from: '~E' + (j + 1), to: '~R' + (i + 1)});

    return {
        schema: schema,
        relations: relations
    }
}

module.exports.group = group;
