import { TICK_SPACINGS, TickMath, FeeAmount } from "@uniswap/v3-sdk";
import { sqrt } from "@uniswap/sdk-core";
import JSBI from "jsbi";

const lps = [
  [999.9, 1000, 10]
];

const getMinTick = (tickSpacing: number) => Math.ceil(-887272 / tickSpacing) * tickSpacing
const getMaxTick = (tickSpacing: number) => Math.floor(887272 / tickSpacing) * tickSpacing

const getNearestTickLower = (tick: number, feeAmount: FeeAmount): number => {
  const tickSpacing = TICK_SPACINGS[feeAmount];
  return getMaxTick(tickSpacing) - tickSpacing * (Math.floor(
      (getMaxTick(tickSpacing) - tick) / tickSpacing
    ))
}

const getNearestTickUpper = (tick: number, feeAmount: FeeAmount): number => {
  const tickSpacing = TICK_SPACINGS[feeAmount];
  return getMinTick(tickSpacing) + tickSpacing * (Math.floor(
    (tick - getMinTick(tickSpacing)) / tickSpacing
  ))
}

const getNearestTick = (tick: number, feeAmount: FeeAmount): number => {
  if (tick >= 0) {
    return getNearestTickUpper(tick, feeAmount);
  } else {
    return getNearestTickLower(tick, feeAmount);
  }
}

const getPriceSqrtX96 = function (value: any) {
    console.log(value)
    const amount1 = JSBI.BigInt(Math.floor(value * 1e20))
    const amount0 = JSBI.BigInt(1 * 1e20)
    const numerator = JSBI.leftShift(JSBI.BigInt(amount1), JSBI.BigInt(192))
    const denominator = JSBI.BigInt(amount0)
    const ratioX192 = JSBI.divide(numerator, denominator)
    return sqrt(ratioX192)
};

const result: any = {
  wethFindPool: {
    initSqrtPriceX96: "",
    positions: [],
  },
  findWethPool: {
    initSqrtPriceX96: "",
    positions: [],
  },
};

let feeAmount = FeeAmount.LOWEST;

// 0 is weth, 1 is find  wethFindPool
result.wethFindPool.initSqrtPriceX96 = getPriceSqrtX96(1000.1).toString();
result.findWethPool.initSqrtPriceX96 = getPriceSqrtX96(1 / (1000.1)).toString();

lps.forEach((value) => {
  const left = value[0];
  const right = value[1];
  const amount = value[2] * 1e4;

  // 0 is weth, 1 is find  ospFindPool
  let tickLeft = TickMath.getTickAtSqrtRatio(getPriceSqrtX96(left));
  let tickRight = TickMath.getTickAtSqrtRatio(getPriceSqrtX96(right));
  console.log("leftright1")
  console.log(tickLeft, tickRight);

  let [tickLower, tickUpper] = [tickLeft, tickRight].sort((a: number, b: number) => {
    return a-b;
  });

  console.log(tickLower, tickUpper);
  tickLower = getNearestTick(tickLower, feeAmount);
  tickUpper = getNearestTick(tickUpper, feeAmount);
  console.log(tickLower, tickUpper);

  result.wethFindPool.positions.push({
    tickLower: tickLower,
    tickUpper: tickUpper,
    amount: amount,
  } as any);

  // 1 is weth, 0 is find  findOspPool
  let tickLeft2 = TickMath.getTickAtSqrtRatio(getPriceSqrtX96(1/left));
  let tickRight2 = TickMath.getTickAtSqrtRatio(getPriceSqrtX96(1/right));
  console.log("leftright2")
  console.log(tickLeft2, tickRight2);

  let [tickLower2, tickUpper2] = [tickLeft2, tickRight2].sort((a: number, b: number) => {
    return a-b;
  });

  console.log(tickLower2, tickUpper2);
  tickLower2 = getNearestTick(tickLower2, feeAmount);
  tickUpper2 = getNearestTick(tickUpper2, feeAmount);
  console.log(tickLower2, tickUpper2);

  result.findWethPool.positions.unshift({
    tickLower: tickLower2,
    tickUpper: tickUpper2,
    amount: amount,
  } as any);
});

console.log(JSON.stringify(result));
