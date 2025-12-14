// Main application logic and view management

let currentGroupId = null;
let editingExpenseId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    renderGroupsView();
});

function initializeApp() {
    // Initialize data structure if it doesn't exist
    if (typeof saveData === 'function') {
        if (!localStorage.getItem('expenseTrackerData')) {
            saveData({ groups: [] });
        }
    } else {
        console.error('saveData function not found. Make sure groups.js is loaded before app.js');
    }
}

function setupEventListeners() {
    // Groups view
    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', showCreateGroupModal);
    }
    
    const backBtn = document.getElementById('back-to-groups-btn');
    if (backBtn) {
        backBtn.addEventListener('click', showGroupsView);
    }

    // Create group modal
    const createGroupForm = document.getElementById('create-group-form');
    if (createGroupForm) {
        createGroupForm.addEventListener('submit', handleCreateGroup);
    }
    
    const addInitialMemberBtn = document.getElementById('add-initial-member-btn');
    if (addInitialMemberBtn) {
        addInitialMemberBtn.addEventListener('click', addInitialMember);
    }
    
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            closeModals();
        });
    });

    // Group detail view
    const addMemberBtn = document.getElementById('add-member-btn');
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', handleAddMember);
    }
    
    const newMemberInput = document.getElementById('new-member-input');
    if (newMemberInput) {
        newMemberInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAddMember();
            }
        });
    }
    
    const addExpenseBtn = document.getElementById('add-expense-btn');
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', showAddExpenseModal);
    }

    // Expense form
    const expenseForm = document.getElementById('add-expense-form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleSaveExpense);
    }
    
    const distributionRadios = document.querySelectorAll('input[name="distribution"]');
    distributionRadios.forEach(radio => {
        radio.addEventListener('change', handleDistributionChange);
    });
    
    const expenseAmountInput = document.getElementById('expense-amount');
    if (expenseAmountInput) {
        expenseAmountInput.addEventListener('input', () => {
            const checkedRadio = document.querySelector('input[name="distribution"]:checked');
            if (checkedRadio && checkedRadio.value === 'percentage') {
                updatePercentageDistribution();
            }
        });
    }
    
    // Update percentage when exclusion changes
    document.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox' && e.target.closest('#exclude-members-list')) {
            const checkedRadio = document.querySelector('input[name="distribution"]:checked');
            if (checkedRadio && checkedRadio.value === 'percentage') {
                updatePercentageDistribution();
            }
        }
    });
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
}

function showGroupsView() {
    showView('groups-view');
    currentGroupId = null;
    renderGroupsView();
}

function showGroupDetailView(groupId) {
    currentGroupId = groupId;
    showView('group-detail-view');
    renderGroupDetail(groupId);
}

function showCreateGroupModal() {
    document.getElementById('create-group-modal').classList.add('active');
    document.getElementById('group-name').value = '';
    document.getElementById('initial-members-list').innerHTML = '';
    document.getElementById('initial-member-input').value = '';
}

function showAddExpenseModal(expenseId = null) {
    if (!currentGroupId) {
        alert('No group selected');
        return;
    }

    const group = getGroupById(currentGroupId);
    if (!group || !group.members || group.members.length === 0) {
        alert('Please add at least one member to the group before adding expenses');
        return;
    }

    editingExpenseId = expenseId;
    const modal = document.getElementById('add-expense-modal');
    const form = document.getElementById('add-expense-form');
    const title = document.getElementById('expense-modal-title');
    
    modal.classList.add('active');
    
    // Reset form first (for new expenses)
    if (!expenseId) {
        form.reset();
        title.textContent = 'Add Expense';
        const equalRadio = document.querySelector('input[name="distribution"][value="equal"]');
        if (equalRadio) {
            equalRadio.checked = true;
        }
    } else {
        title.textContent = 'Edit Expense';
    }
    
    // Populate the form with group members (this must happen after reset)
    populateExpenseForm(currentGroupId);
    
    if (expenseId) {
        // Load expense data for editing
        const group = getGroupById(currentGroupId);
        if (group) {
            const expense = group.expenses.find(e => e.id === expenseId);
            if (expense) {
                document.getElementById('expense-description').value = expense.description;
                document.getElementById('expense-amount').value = expense.amount;
                document.getElementById('expense-paid-by').value = expense.paidBy;
                const distributionRadio = document.querySelector(`input[name="distribution"][value="${expense.distribution}"]`);
                if (distributionRadio) {
                    distributionRadio.checked = true;
                }
                handleDistributionChange();
                if (expense.distribution === 'percentage') {
                    Object.keys(expense.shares).forEach(member => {
                        const input = document.querySelector(`#percentage-${member.replace(/\s+/g, '-')}`);
                        if (input) {
                            // Calculate percentage from share
                            const percentage = (expense.shares[member] / expense.amount) * 100;
                            input.value = percentage.toFixed(2);
                        }
                    });
                    updatePercentageTotal();
                }
                // Set excluded members
                if (expense.excluded) {
                    expense.excluded.forEach(member => {
                        const checkbox = document.querySelector(`#exclude-${member.replace(/\s+/g, '-')}`);
                        if (checkbox) checkbox.checked = true;
                    });
                }
            }
        }
    } else {
        // For new expenses, ensure distribution is set to equal
        handleDistributionChange();
    }
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    editingExpenseId = null;
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModals();
    }
});

function populateExpenseForm(groupId) {
    const group = getGroupById(groupId);
    if (!group) {
        alert('Group not found');
        return;
    }

    if (!group.members || group.members.length === 0) {
        alert('Please add at least one member to the group before adding expenses');
        return;
    }

    // Populate paid by dropdown
    const paidBySelect = document.getElementById('expense-paid-by');
    paidBySelect.innerHTML = '';
    group.members.forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.textContent = member;
        paidBySelect.appendChild(option);
    });

    // Populate exclude members checkboxes
    const excludeList = document.getElementById('exclude-members-list');
    excludeList.innerHTML = '';
    group.members.forEach(member => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `exclude-${member.replace(/\s+/g, '-')}`;
        checkbox.value = member;
        checkbox.addEventListener('change', () => {
            if (document.querySelector('input[name="distribution"]:checked').value === 'percentage') {
                updatePercentageDistribution();
            }
        });
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(member));
        excludeList.appendChild(label);
    });

    // Setup percentage inputs
    setupPercentageInputs(group.members);
    handleDistributionChange();
}

function setupPercentageInputs(members) {
    const container = document.getElementById('percentage-inputs');
    container.innerHTML = '';
    
    members.forEach(member => {
        const div = document.createElement('div');
        div.className = 'percentage-input-item';
        const label = document.createElement('label');
        label.textContent = member;
        const input = document.createElement('input');
        input.type = 'number';
        input.id = `percentage-${member.replace(/\s+/g, '-')}`;
        input.min = 0;
        input.max = 100;
        input.step = 0.01;
        input.value = 0;
        input.addEventListener('input', updatePercentageTotal);
        div.appendChild(label);
        div.appendChild(input);
        container.appendChild(div);
    });
}

function handleDistributionChange() {
    const checkedRadio = document.querySelector('input[name="distribution"]:checked');
    if (!checkedRadio) return;
    
    const distribution = checkedRadio.value;
    const percentageGroup = document.getElementById('percentage-inputs-group');
    if (!percentageGroup) return;
    
    if (distribution === 'percentage') {
        percentageGroup.style.display = 'block';
        updatePercentageDistribution();
    } else {
        percentageGroup.style.display = 'none';
    }
}

function updatePercentageDistribution() {
    if (!currentGroupId) return;
    const group = getGroupById(currentGroupId);
    if (!group) return;

    const distribution = document.querySelector('input[name="distribution"]:checked');
    if (!distribution || distribution.value !== 'percentage') return;

    const excluded = Array.from(document.querySelectorAll('#exclude-members-list input:checked'))
        .map(cb => cb.value);
    const includedMembers = group.members.filter(m => !excluded.includes(m));
    
    if (includedMembers.length === 0) {
        // Don't update if all are excluded, but don't prevent form from working
        return;
    }
    
    // Distribute equally among included members
    const equalShare = 100 / includedMembers.length;
    includedMembers.forEach(member => {
        const input = document.querySelector(`#percentage-${member.replace(/\s+/g, '-')}`);
        if (input) input.value = equalShare.toFixed(2);
    });
    
    updatePercentageTotal();
}

function updatePercentageTotal() {
    const inputs = document.querySelectorAll('#percentage-inputs input');
    let total = 0;
    inputs.forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('percentage-total').textContent = total.toFixed(2);
}

function handleCreateGroup(e) {
    e.preventDefault();
    const name = document.getElementById('group-name').value.trim();
    const members = Array.from(document.getElementById('initial-members-list').querySelectorAll('.member-tag'))
        .map(tag => tag.textContent.trim());

    if (!name) {
        alert('Please enter a group name');
        return;
    }

    if (members.length === 0) {
        alert('Please add at least one member');
        return;
    }

    createGroup(name, members);
    closeModals();
    renderGroupsView();
}

function addInitialMember() {
    const input = document.getElementById('initial-member-input');
    const name = input.value.trim();
    
    if (!name) return;
    
    const existing = Array.from(document.getElementById('initial-members-list').querySelectorAll('.member-tag'))
        .map(tag => tag.textContent.trim());
    
    if (existing.includes(name)) {
        alert('Member already added');
        return;
    }

    const tag = document.createElement('span');
    tag.className = 'member-tag';
    tag.textContent = name;
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-member';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => tag.remove();
    tag.appendChild(removeBtn);
    
    document.getElementById('initial-members-list').appendChild(tag);
    input.value = '';
}

function handleAddMember() {
    const input = document.getElementById('new-member-input');
    const name = input.value.trim();
    
    if (!name) {
        alert('Please enter a member name');
        return;
    }

    if (!currentGroupId) return;
    
    const group = getGroupById(currentGroupId);
    if (group.members.includes(name)) {
        alert('Member already exists');
        input.value = '';
        return;
    }

    addMemberToGroup(currentGroupId, name);
    input.value = '';
    renderGroupDetail(currentGroupId);
}

function handleSaveExpense(e) {
    e.preventDefault();
    
    const description = document.getElementById('expense-description').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const paidBy = document.getElementById('expense-paid-by').value;
    const checkedRadio = document.querySelector('input[name="distribution"]:checked');
    if (!checkedRadio) {
        alert('Please select a distribution method');
        return;
    }
    const distribution = checkedRadio.value;
    const excluded = Array.from(document.querySelectorAll('#exclude-members-list input:checked'))
        .map(cb => cb.value);

    if (!description || !amount || amount <= 0) {
        alert('Please fill in all required fields with valid values');
        return;
    }

    const group = getGroupById(currentGroupId);
    if (!group) return;

    let shares = {};
    
    if (distribution === 'equal') {
        const includedMembers = group.members.filter(m => !excluded.includes(m));
        if (includedMembers.length === 0) {
            alert('At least one member must be included in the expense');
            return;
        }
        const share = amount / includedMembers.length;
        includedMembers.forEach(member => {
            shares[member] = share;
        });
    } else {
        // Percentage distribution
        const percentageInputs = document.querySelectorAll('#percentage-inputs input');
        let totalPercentage = 0;
        percentageInputs.forEach(input => {
            const member = input.previousElementSibling.textContent.trim();
            const percentage = parseFloat(input.value) || 0;
            if (!excluded.includes(member)) {
                shares[member] = (amount * percentage) / 100;
                totalPercentage += percentage;
            }
        });
        
        if (Math.abs(totalPercentage - 100) > 0.01) {
            alert('Percentage distribution must total 100%');
            return;
        }
    }

    const expenseData = {
        description,
        amount,
        paidBy,
        distribution,
        shares,
        excluded: excluded || [] // Ensure excluded is always an array
    };

    console.log('Saving expense:', expenseData); // Debug log
    console.log('Current group ID:', currentGroupId); // Debug log
    
    let result;
    if (editingExpenseId) {
        result = updateExpense(currentGroupId, editingExpenseId, expenseData);
        console.log('Expense updated:', result);
    } else {
        result = addExpense(currentGroupId, expenseData);
        console.log('Expense added:', result);
    }
    
    if (!result) {
        alert('Failed to save expense. Please try again.');
        return;
    }
    
    // Verify the expense was saved by reloading from storage
    const groupAfterSave = getGroupById(currentGroupId);
    console.log('Group expenses after save:', groupAfterSave ? groupAfterSave.expenses : 'Group not found');
    
    if (groupAfterSave && groupAfterSave.expenses) {
        console.log('Number of expenses:', groupAfterSave.expenses.length);
    }

    closeModals();
    
    // Re-render the group detail to show the new expense
    renderGroupDetail(currentGroupId);
}

function renderGroupsView() {
    const groups = getAllGroups();
    const container = document.getElementById('groups-list');
    
    if (groups.length === 0) {
        container.innerHTML = '<p class="empty-state">No groups yet. Create your first group to get started!</p>';
        return;
    }

    container.innerHTML = groups.map(group => {
        const expenses = group.expenses || [];
        const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        return `
            <div class="group-card" onclick="showGroupDetailView('${group.id}')">
                <div class="group-card-header">
                    <h3>${escapeHtml(group.name)}</h3>
                    <button class="btn-icon delete-group-btn" onclick="event.stopPropagation(); handleDeleteGroup('${group.id}')" title="Delete group">×</button>
                </div>
                <div class="group-card-info">
                    <span>${group.members.length} member${group.members.length !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>₹${totalExpenses.toFixed(2)} total</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderGroupDetail(groupId) {
    const group = getGroupById(groupId);
    if (!group) {
        showGroupsView();
        return;
    }

    document.getElementById('group-detail-name').textContent = group.name;
    
    // Render members
    const membersList = document.getElementById('group-members-list');
    membersList.innerHTML = group.members.map(member => `
        <span class="member-tag">
            ${escapeHtml(member)}
            <button class="remove-member" onclick="handleRemoveMember('${groupId}', '${escapeHtml(member)}')" title="Remove member">×</button>
        </span>
    `).join('');

    // Render expenses
    renderExpenses(groupId);
    
    // Render settlement
    if (typeof renderSettlement === 'function') {
        renderSettlement(groupId);
    } else {
        console.error('renderSettlement function not found');
    }
}

function renderExpenses(groupId) {
    const group = getGroupById(groupId);
    if (!group) {
        console.error('Group not found for ID:', groupId);
        return;
    }

    const container = document.getElementById('expenses-list');
    if (!container) {
        console.error('Expenses list container not found');
        return;
    }
    
    // Ensure expenses array exists
    if (!group.expenses || !Array.isArray(group.expenses)) {
        console.warn('Group expenses is not an array, initializing:', group);
        group.expenses = [];
    }
    
    if (group.expenses.length === 0) {
        container.innerHTML = '<p class="empty-state">No expenses yet. Add your first expense!</p>';
        return;
    }
    
    console.log('Rendering expenses:', group.expenses); // Debug log

    container.innerHTML = group.expenses.map(expense => {
        // Ensure shares and excluded exist
        const shares = expense.shares || {};
        const excluded = expense.excluded || [];
        
        const sharesList = Object.entries(shares)
            .map(([member, amount]) => `${escapeHtml(member)}: ₹${parseFloat(amount).toFixed(2)}`)
            .join(', ');
        
        return `
            <div class="expense-card">
                <div class="expense-header">
                    <div>
                        <h4>${escapeHtml(expense.description || 'Untitled Expense')}</h4>
                        <p class="expense-meta">Paid by ${escapeHtml(expense.paidBy || 'Unknown')} • ${escapeHtml(expense.distribution === 'equal' ? 'Equal' : 'Percentage')} split</p>
                    </div>
                    <div class="expense-amount">₹${parseFloat(expense.amount || 0).toFixed(2)}</div>
                </div>
                <div class="expense-details">
                    <p><strong>Shares:</strong> ${sharesList || 'No shares'}</p>
                    ${excluded.length > 0 ? `<p><strong>Excluded:</strong> ${excluded.map(e => escapeHtml(e)).join(', ')}</p>` : ''}
                </div>
                <div class="expense-actions">
                    <button class="btn btn-small btn-secondary" onclick="showAddExpenseModal('${expense.id}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="handleDeleteExpense('${groupId}', '${expense.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function handleDeleteGroup(groupId) {
    if (confirm('Are you sure you want to delete this group? All expenses will be lost.')) {
        deleteGroup(groupId);
        renderGroupsView();
    }
}

function handleRemoveMember(groupId, memberName) {
    if (confirm(`Remove ${memberName} from this group?`)) {
        removeMemberFromGroup(groupId, memberName);
        renderGroupDetail(groupId);
    }
}

function handleDeleteExpense(groupId, expenseId) {
    if (confirm('Are you sure you want to delete this expense?')) {
        deleteExpense(groupId, expenseId);
        renderGroupDetail(groupId);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions available globally
window.showGroupDetailView = showGroupDetailView;
window.handleDeleteGroup = handleDeleteGroup;
window.handleRemoveMember = handleRemoveMember;
window.handleDeleteExpense = handleDeleteExpense;
window.showAddExpenseModal = showAddExpenseModal;

