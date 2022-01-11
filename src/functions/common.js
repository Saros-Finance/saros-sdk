import bigdecimal from 'bigdecimal';

export const convertWeiToBalance = (strValue, iDecimal = 18) => {
  try {
    if (parseFloat(strValue) === 0) return 0;
    const multiplyNum = new bigdecimal.BigDecimal(Math.pow(10, iDecimal));
    const convertValue = new bigdecimal.BigDecimal(String(strValue));
    return convertValue.divide(multiplyNum).toString();
  } catch (err) {
    return 0;
  }
};

export const convertBalanceToWei = (strValue, iDecimal = 18) => {
  try {
    const multiplyNum = new bigdecimal.BigDecimal(Math.pow(10, iDecimal));
    const convertValue = new bigdecimal.BigDecimal(String(strValue));
    return multiplyNum.multiply(convertValue).toString().split('.')[0];
  } catch (err) {
    return 0;
  }
};

export const renderAmountSlippage = (amount, slippage) => {
  return (parseFloat(amount) * parseFloat(slippage)) / 100;
};

export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
