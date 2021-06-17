// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../libraries/IHEX.sol";

contract HEX is IHEX {
    uint40 public _stakeId;
    mapping(address => uint256) public _stakeCount;
    mapping(address => uint256) public _balances;

    struct Stake {
        uint40 stakeId;
        uint72 stakedHearts;
        uint72 stakeShares;
        uint16 lockedDay;
        uint16 stakedDays;
        uint16 unlockedDay;
        bool isAutoStake;
    }
    mapping(address => mapping(uint40 => Stake)) public _stakes;

    struct StakeMetadata {
        bool ended;
        bool endedEarly;
        bool endedLate;
    }
    mapping(address => mapping(uint40 => StakeMetadata)) public _stakesMetadata;

    uint256 internal LAUNCH_TIME;

    constructor() {
        LAUNCH_TIME = block.timestamp - 540 days;
    }

    receive() external payable {}

    function approve(address spender, uint256 amount) external override returns (bool) {}

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function currentDay() external view override returns (uint256) {
        return _currentDay();
    }

    function stakeCount(address stakerAddr) external view override returns (uint256) {
        return _stakeCount[stakerAddr];
    }

    function stakeEnd(uint256 stakeIndex, uint40 stakeIdParam) external override {
        Stake storage stake = _stakes[msg.sender][stakeIdParam];
        require(stake.stakedHearts != 0, "stake must exist");
        require(stake.unlockedDay == 0, "stake already ended");

        uint256 day = _currentDay();
        uint256 penaltyHearts = 0;
        if (day > stake.lockedDay + 14) {
            penaltyHearts = stake.stakedHearts / 2;
        } else if (day > stake.lockedDay + 365) {
            penaltyHearts = stake.stakedHearts;
        }

        mintHearts(msg.sender, stake.stakedHearts - penaltyHearts);
        stake.unlockedDay = uint16(day);

        //keep track for testing
        uint256 servedDays = day < stake.lockedDay ? 0 : day - uint256(stake.lockedDay);
        StakeMetadata storage metadata = _stakesMetadata[msg.sender][stakeIdParam];
        metadata.ended = true;
        metadata.endedEarly = servedDays < uint256(stake.stakedDays);
        metadata.endedLate = servedDays > uint256(stake.stakedDays) + 14;
    }

    function stakeLists(address addr, uint256 id)
        external
        view
        override
        returns (
            uint40 stakeId,
            uint72 stakedHearts,
            uint72 stakeShares,
            uint16 lockedDay,
            uint16 stakedDays,
            uint16 unlockedDay,
            bool isAutoStake
        )
    {
        Stake memory s = _stakes[addr][uint40(id)];
        return (s.stakeId, s.stakedHearts, s.stakeShares, s.lockedDay, s.stakedDays, s.unlockedDay, s.isAutoStake);
    }

    function stakeStart(uint256 newStakedHearts, uint256 newStakedDays) external override {
        require(newStakedDays != 0 && newStakedDays <= 5555, "too long");
        require(newStakedHearts != 0, "no hearts staked");
        require(newStakedHearts <= _balances[msg.sender], "more hearts staked than balance");
        _balances[msg.sender] -= newStakedHearts;
        uint40 id = _stakeId;
        _stakes[msg.sender][id] = Stake(
            uint40(id),
            uint72(newStakedHearts),
            uint72(newStakedHearts),
            uint16(_currentDay() + 1),
            uint16(newStakedDays),
            0,
            false
        );
        _stakeCount[msg.sender]++;
        _stakeId++;
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        require(_balances[msg.sender] >= amount, "balance too low");
        _balances[msg.sender] -= amount;
        _balances[recipient] += amount;
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external override returns (bool) {
        require(_balances[sender] >= amount, "balance too low");
        _balances[sender] -= amount;
        _balances[recipient] += amount;
        return true;
    }

    function mintHearts(address recipient, uint256 amount) public {
        _balances[recipient] += amount;
    }

    function burnHearts(address recipient, uint256 amount) public {
        require(_balances[recipient] >= amount);
        _balances[recipient] -= amount;
    }

    function _currentDay() internal view returns (uint256) {
        return (block.timestamp - LAUNCH_TIME) / 1 days;
    }
}
