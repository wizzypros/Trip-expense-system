// Settlement calculation functions

// Import functions from groups.js (they're in global scope)
// getGroupById is available

function calculateBalances(groupId) {
    const group = getGroupById(groupId);
    if (!group) return {};

    const balances = {};
    
    // Initialize balances for all members
    group.members.forEach(member => {
        balances[member] = 0;
    });

    // Calculate net balance for each member
    group.expenses.forEach(expense => {
        const paidBy = expense.paidBy;
        const amount = expense.amount;
        
        // Person who paid gets credited with the full amount
        balances[paidBy] = (balances[paidBy] || 0) + amount;
        
        // Each person's share is deducted from their balance
        Object.entries(expense.shares).forEach(([member, share]) => {
            balances[member] = (balances[member] || 0) - share;
        });
    });

    return balances;
}

function calculateSettlement(groupId) {
    const balances = calculateBalances(groupId);
    return simplifyDebts(balances);
}

function simplifyDebts(balances) {
    // Separate creditors (positive balance) and debtors (negative balance)
    const creditors = [];
    const debtors = [];
    
    Object.entries(balances).forEach(([person, balance]) => {
        if (Math.abs(balance) < 0.01) return; // Ignore near-zero balances
        
        if (balance > 0) {
            creditors.push({ person, amount: balance });
        } else {
            debtors.push({ person, amount: Math.abs(balance) });
        }
    });

    // Sort by amount (largest first)
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const transactions = [];
    let creditorIndex = 0;
    let debtorIndex = 0;

    // Greedy algorithm to minimize transactions
    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
        const creditor = creditors[creditorIndex];
        const debtor = debtors[debtorIndex];

        const amount = Math.min(creditor.amount, debtor.amount);
        
        if (amount > 0.01) { // Only add if significant
            transactions.push({
                from: debtor.person,
                to: creditor.person,
                amount: parseFloat(amount.toFixed(2))
            });
        }

        creditor.amount -= amount;
        debtor.amount -= amount;

        if (creditor.amount < 0.01) creditorIndex++;
        if (debtor.amount < 0.01) debtorIndex++;
    }

    return transactions;
}

function renderSettlement(groupId) {
    const balances = calculateBalances(groupId);
    const transactions = calculateSettlement(groupId);
    const container = document.getElementById('settlement-content');
    
    if (Object.keys(balances).length === 0) {
        container.innerHTML = '<p class="empty-state">No members in this group.</p>';
        return;
    }

    // Check if all balances are zero
    const allZero = Object.values(balances).every(b => Math.abs(b) < 0.01);
    
    if (allZero) {
        container.innerHTML = '<p class="settlement-status balanced">All settled up! No debts.</p>';
        return;
    }

    let html = '<div class="balances-section"><h4>Net Balances</h4><div class="balances-list">';
    
    Object.entries(balances)
        .sort((a, b) => b[1] - a[1])
        .forEach(([person, balance]) => {
            const className = balance > 0 ? 'balance-positive' : balance < 0 ? 'balance-negative' : 'balance-zero';
            const sign = balance > 0 ? '+' : '';
            html += `
                <div class="balance-item ${className}">
                    <span class="balance-person">${escapeHtml(person)}</span>
                    <span class="balance-amount">${sign}₹${balance.toFixed(2)}</span>
                </div>
            `;
        });
    
    html += '</div></div>';

    if (transactions.length > 0) {
        html += '<div class="transactions-section"><h4>Simplified Settlement</h4><div class="transactions-list">';
        transactions.forEach(transaction => {
            html += `
                <div class="transaction-item">
                    <span class="transaction-from">${escapeHtml(transaction.from)}</span>
                    <span class="transaction-arrow">→</span>
                    <span class="transaction-to">${escapeHtml(transaction.to)}</span>
                    <span class="transaction-amount">₹${transaction.amount.toFixed(2)}</span>
                </div>
            `;
        });
        html += '</div></div>';
    } else {
        html += '<p class="settlement-status">All balances are settled.</p>';
    }

    container.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

