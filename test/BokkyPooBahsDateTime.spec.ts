import { expect } from './share/expect'
import { BokkyPooBahsDateTimeLibraryTest } from '../typechain/BokkyPooBahsDateTimeLibraryTest'
import { ethers, waffle } from 'hardhat'

const { BigNumber } = ethers

describe('BokkyPooBahsDateTime', () => {
  let bokkyPooBahsDateTime: BokkyPooBahsDateTimeLibraryTest
  const fixture = async () => {
    const factory = await ethers.getContractFactory('BokkyPooBahsDateTimeLibraryTest')
    return (await factory.deploy()) as BokkyPooBahsDateTimeLibraryTest
  }
  beforeEach('deploy BokkyPooBahsDateTimeLibraryTest', async () => {
    bokkyPooBahsDateTime = await waffle.loadFixture(fixture)
  })

  describe('#timestampToDate', () => {
    it('0', async () => {
      const { year, day, month } = await bokkyPooBahsDateTime.timestampToDate(0)
      expect(year).to.eq(1970)
      expect(day).to.eq(1)
      expect(month).to.eq(1)
    })
    it('20', async () => {
      const { year, day, month } = await bokkyPooBahsDateTime.timestampToDate(BigNumber.from(20).mul(24 * 60 * 60))
      expect(year).to.eq(1970)
      expect(day).to.eq(21)
      expect(month).to.eq(1)
    })
    it('leap year', async () => {
      // 1972-2-29
      const { year, day, month } = await bokkyPooBahsDateTime.timestampToDate(BigNumber.from(68169600))
      expect(year).to.eq(1972)
      expect(month).to.eq(2)
      expect(day).to.eq(29)

      const { year: y2, day: d2, month: m2 } = await bokkyPooBahsDateTime.timestampToDate(BigNumber.from(68169600 + 24 * 60 * 60))
      expect(y2).to.eq(1972)
      expect(m2).to.eq(3)
      expect(d2).to.eq(1)
    })
    it('uint256max', async () => {
      const { year, day, month } = await bokkyPooBahsDateTime.timestampToDate(BigNumber.from(2).pow(256).sub(1))
      expect(year).to.be.respondsTo('toNumber')
      expect(day).to.be.respondsTo('toNumber')
      expect(month).to.be.respondsTo('toNumber')
    })
    it('now', async () => {
      const { year, day, month } = await bokkyPooBahsDateTime.timestampToDate(BigNumber.from(1664452458))
      expect(year).to.eq(2022)
      expect(month).to.eq(9)
      expect(day).to.eq(29)
    })
  })

})
