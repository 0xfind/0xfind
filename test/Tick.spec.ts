import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { TickTest } from '../typechain/TickTest'
import { expect } from './share/expect'

const MaxUint128 = BigNumber.from(2).pow(128).sub(1)

const { constants } = ethers

describe('Tick', () => {
  let tickTest: TickTest

  beforeEach('deploy TickTest', async () => {
    const tickTestFactory = await ethers.getContractFactory('TickTest')
    tickTest = (await tickTestFactory.deploy()) as TickTest
  })

  describe('#getFeeGrowthInside', () => {

    it('subtracts upper tick if below', async () => {
      await tickTest.setTick(2, {
        liquidityGross: 0,
        liquidityNet: 0,
        initialized: true,
      })
    })

    it('subtracts lower tick if above', async () => {
      await tickTest.setTick(-2, {
        liquidityGross: 0,
        liquidityNet: 0,
        initialized: true,
      })
    })

    it('subtracts upper and lower tick if inside', async () => {
      await tickTest.setTick(-2, {
        liquidityGross: 0,
        liquidityNet: 0,
        initialized: true,
      })
      await tickTest.setTick(2, {
        liquidityGross: 0,
        liquidityNet: 0,
        initialized: true,
      })
    })

    it('works correctly with overflow on inside tick', async () => {
      await tickTest.setTick(-2, {
        liquidityGross: 0,
        liquidityNet: 0,
        initialized: true,
      })
      await tickTest.setTick(2, {
        liquidityGross: 0,
        liquidityNet: 0,
        initialized: true,
      })
    })
  })

  describe('#update', async () => {
    it('flips from zero to nonzero', async () => {
      expect(await tickTest.callStatic.update(0, 1, false, 3)).to.eq(true)
    })
    it('does not flip from nonzero to greater nonzero', async () => {
      await tickTest.update(0, 1, false, 3)
      expect(await tickTest.callStatic.update(0, 1, false, 3)).to.eq(false)
    })
    it('flips from nonzero to zero', async () => {
      await tickTest.update(0, 1, false, 3)
      expect(await tickTest.callStatic.update(0, -1, false, 3)).to.eq(true)
    })
    it('does not flip from nonzero to lesser nonzero', async () => {
      await tickTest.update(0, 2, false, 3)
      expect(await tickTest.callStatic.update(0, -1, false, 3)).to.eq(false)
    })
    it('does not flip from nonzero to lesser nonzero', async () => {
      await tickTest.update(0, 2, false, 3)
      expect(await tickTest.callStatic.update(0, -1, false, 3)).to.eq(false)
    })
    it('reverts if total liquidity gross is greater than max', async () => {
      await tickTest.update(0, 2, false, 3)
      await tickTest.update(0, 1, true, 3)
      await expect(tickTest.update(0, 1, false, 3)).to.be.revertedWith('LO')
    })
    it('nets the liquidity based on upper flag', async () => {
      await tickTest.update(0, 2, false, 10)
      await tickTest.update(0, 1, true, 10)
      await tickTest.update(0, 3, true, 10)
      await tickTest.update(0, 1, false, 10)
      const { liquidityGross, liquidityNet } = await tickTest.ticks(0)
      expect(liquidityGross).to.eq(2 + 1 + 3 + 1)
      expect(liquidityNet).to.eq(2 - 1 - 3 + 1)
    })
    it('reverts on overflow liquidity gross', async () => {
      await tickTest.update(0, MaxUint128.div(2).sub(1), false, MaxUint128)
      await expect(tickTest.update(0, MaxUint128.div(2).sub(1), false, MaxUint128)).to.be.reverted
    })
    it('assumes all growth happens below ticks lte current tick', async () => {
      await tickTest.update(1, 1, false, MaxUint128)
      const {
        initialized,
      } = await tickTest.ticks(1)
      expect(initialized).to.eq(true)
    })
    it('does not set any growth fields if tick is already initialized', async () => {
      await tickTest.update(1, 1, false, MaxUint128)
      await tickTest.update(1, 1, false, MaxUint128)
      const {
        initialized,
      } = await tickTest.ticks(1)
      expect(initialized).to.eq(true)
    })
    it('does not set any growth fields for ticks gt current tick', async () => {
      await tickTest.update(2, 1, false, MaxUint128)
      const {
        initialized,
      } = await tickTest.ticks(2)
      expect(initialized).to.eq(true)
    })
  })

  describe('#cross', () => {
    it('flips the growth variables', async () => {
      await tickTest.setTick(2, {
        liquidityGross: 3,
        liquidityNet: 4,
        initialized: true,
      })
      await tickTest.cross(2)
      const {
        liquidityGross,
        liquidityNet,
        initialized
      } = await tickTest.ticks(2)
      expect(liquidityGross).to.eq(3)
      expect(liquidityNet).to.eq(4)
      expect(initialized).to.eq(true)
    })
    it('two flips are no op', async () => {
      await tickTest.setTick(2, {
        liquidityGross: 3,
        liquidityNet: 4,
        initialized: true,
      })
      await tickTest.cross(2)
      await tickTest.cross(2)
      const {
        liquidityGross,
        liquidityNet,
        initialized
      } = await tickTest.ticks(2)
      expect(liquidityGross).to.eq(3)
      expect(liquidityNet).to.eq(4)
      expect(initialized).to.eq(true)
    })
  })
})
