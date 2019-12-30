import React from 'react'
import { useBlockNumber } from '../contexts/Application'

export default function Home() {
  const blockNumber = useBlockNumber()

  return <div>Block Number: {blockNumber}</div>
}
