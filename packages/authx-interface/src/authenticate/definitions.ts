export interface Authority {
  id: string;
  strategy: string;
  name: string;
}

export interface StrategyComponentProps {
  authority: Authority;
  authorities: Authority[];
}
