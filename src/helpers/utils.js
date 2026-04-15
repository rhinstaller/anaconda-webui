/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

/* Check if the given arrays are equal
 * - works only with primitive values
 * @param {Array} array1
 * @param {Array} array2
 * @returns {Boolean} True if the arrays are equal
 */
export const checkIfArraysAreEqual = (array1, array2) => {
    const array1Sorted = array1.sort();
    const array2Sorted = array2.sort();

    return (
        array1Sorted.length === array2Sorted.length &&
        array1Sorted.every((value, index) => value === array2Sorted[index])
    );
};
