const cron = require('node-cron');
const {BookingSercice} = require('../../services')
function scheduleCrons(){
    cron.schedule('*/60 * * * * *',async()=>{
       await BookingSercice.cancelOldBookings();
    })
};

module.exports = scheduleCrons;