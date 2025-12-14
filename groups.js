// Group management functions

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getData() {
    const data = localStorage.getItem('expenseTrackerData');
    return data ? JSON.parse(data) : { groups: [] };
}

function saveData(data) {
    localStorage.setItem('expenseTrackerData', JSON.stringify(data));
}

function getAllGroups() {
    return getData().groups;
}

function getGroupById(id) {
    const groups = getAllGroups();
    return groups.find(g => g.id === id);
}

function createGroup(name, members) {
    const data = getData();
    const group = {
        id: generateId(),
        name: name.trim(),
        members: members.map(m => m.trim()),
        expenses: []
    };
    data.groups.push(group);
    saveData(data);
    return group;
}

function addMemberToGroup(groupId, memberName) {
    const data = getData();
    const group = data.groups.find(g => g.id === groupId);
    if (group && !group.members.includes(memberName.trim())) {
        group.members.push(memberName.trim());
        saveData(data);
    }
}

function removeMemberFromGroup(groupId, memberName) {
    const data = getData();
    const group = data.groups.find(g => g.id === groupId);
    if (group) {
        group.members = group.members.filter(m => m !== memberName);
        // Remove expenses where this member was the only payer or remove their shares
        group.expenses = group.expenses.map(expense => {
            if (expense.paidBy === memberName) {
                // If this member paid, we might want to handle this differently
                // For now, we'll just remove their shares
                delete expense.shares[memberName];
            } else {
                delete expense.shares[memberName];
            }
            // Remove from excluded list if present
            expense.excluded = expense.excluded.filter(e => e !== memberName);
            return expense;
        }).filter(expense => {
            // Remove expenses with no valid shares
            const validShares = Object.keys(expense.shares).filter(m => 
                group.members.includes(m) && expense.shares[m] > 0
            );
            return validShares.length > 0;
        });
        saveData(data);
    }
}

function deleteGroup(id) {
    const data = getData();
    data.groups = data.groups.filter(g => g.id !== id);
    saveData(data);
}

