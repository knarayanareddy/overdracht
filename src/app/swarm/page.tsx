import { readFileSync } from 'node:fs';
import SwarmLab from './SwarmLab';
import type { Ensemble } from '@/domain/swarm/ensemble';
export const metadata={title:'Swarm lab'};
export default function Page(){const ensemble=JSON.parse(readFileSync('data/swarm/runs.json','utf8')) as Ensemble;return <SwarmLab initial={ensemble}/>;}
