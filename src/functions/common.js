import bigdecimal from 'bigdecimal';
import { get } from 'lodash';

export const SOL_BLOCK_TIME = 0.4; // 0.4s
export const BLOCKS_PER_YEAR = (60 / SOL_BLOCK_TIME) * 60 * 24 * 365; // 78840000
export const PRECISION_MULTIPLIER = 10 ** 9;

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

export const getPriceBaseId = async (id) => {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
  );
  const body = await response.json();
  return get(body, `${id}.usd`, 0);
};
