// Expense management functions

// Import functions from groups.js (they're in global scope)
// generateId, getData, saveData, getGroupById are available

function addExpense(groupId, expenseData) {
    const data = getData();
    const group = data.groups.find(g => g.id === groupId);
    if (group) {
        const expense = {
            id: generateId(),
            ...expenseData
        };
        group.expenses.push(expense);
        saveData(data);
        return expense;
    }
}

function getExpensesByGroup(groupId) {
    const group = getGroupById(groupId);
    return group ? group.expenses : [];
}

function updateExpense(groupId, expenseId, expenseData) {
    const data = getData();
    const group = data.groups.find(g => g.id === groupId);
    if (group) {
        const expense = group.expenses.find(e => e.id === expenseId);
        if (expense) {
            Object.assign(expense, expenseData);
            saveData(data);
            return expense;
        }
    }
}

function deleteExpense(groupId, expenseId) {
    const data = getData();
    const group = data.groups.find(g => g.id === groupId);
    if (group) {
        group.expenses = group.expenses.filter(e => e.id !== expenseId);
        saveData(data);
    }
}

function calculateDistribution(amount, method, members, excluded) {
    const includedMembers = members.filter(m => !excluded.includes(m));
    
    if (method === 'equal') {
        const share = amount / includedMembers.length;
        const shares = {};
        includedMembers.forEach(member => {
            shares[member] = share;
        });
        return shares;
    }
    
    // For percentage, this is handled in the form
    return {};
}

