const Inventory = require('../models/Inventory');

// Helper to get or create the single Inventory document
const getInventory = async () => {
    let inv = await Inventory.findOne();
    if (!inv) {
        // Initial Seed (Example: Plant ke paas shuru mein 100 empty jars hain)
        inv = await Inventory.create({ filledJars: 0, emptyJars: 100, damagedJars: 0 });
    }
    return inv;
};

// 1. View Plant Jar Stocks (inventory.view_stock)
exports.getStocks = async (req, res) => {
    try {
        const inv = await getInventory();
        res.status(200).json(inv);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 2. Plant Operation: Fill Empty Jars (Bonus practical feature)
exports.fillJars = async (req, res) => {
    try {
        const { count } = req.body;
        const inv = await getInventory();

        if (inv.emptyJars < count) {
            return res.status(400).json({ message: `Only ${inv.emptyJars} empty jars available to fill!` });
        }

        inv.emptyJars -= Number(count);
        inv.filledJars += Number(count);
        await inv.save();

        res.status(200).json({ message: `✅ ${count} Jars Filled successfully!`, inventory: inv });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 3. Record Empty Jar Returns (inventory.empty_jar_return)
exports.recordEmptyReturns = async (req, res) => {
    try {
        const { count } = req.body;
        if (!count || count <= 0) return res.status(400).json({ message: "Invalid count" });

        const inv = await getInventory();
        inv.emptyJars += Number(count); // Plant me empty jars aagaye
        await inv.save();

        res.status(200).json({ message: `✅ ${count} Empty Jars returned to plant.`, inventory: inv });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 4. Mark Damaged Jars (inventory.damaged_jars)
exports.markDamaged = async (req, res) => {
    try {
        const { count, fromStatus, reason } = req.body; // fromStatus: 'EMPTY' or 'FILLED'
        const inv = await getInventory();

        if (fromStatus === 'EMPTY') {
            if (inv.emptyJars < count) return res.status(400).json({ message: "Not enough empty jars." });
            inv.emptyJars -= Number(count);
        } else {
            if (inv.filledJars < count) return res.status(400).json({ message: "Not enough filled jars." });
            inv.filledJars -= Number(count);
        }

        inv.damagedJars += Number(count);
        await inv.save();

        res.status(200).json({ message: `🚨 ${count} Jars marked as damaged.`, inventory: inv });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};