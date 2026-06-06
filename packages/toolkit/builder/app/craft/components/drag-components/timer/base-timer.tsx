import { TeamsBasicTimer } from '@ever-teams/atoms';
import { useEditor, useNode } from '@craftjs/core';
import React, { useEffect } from 'react';
import { ActiveBorder } from '../../active-border';
import { EditBar } from '../../editbar';
import { baseTimerEditbarConfig } from '../config/timer';
import { BaseTimerProps } from '../_constants/timer';

export const BaseTimer = ({ ...props }: typeof BaseTimerProps) => {
    const {
        connectors: { connect, drag },
        selected,
        id
    } = useNode((state) => ({
        selected: state?.events?.selected,
        dragged: state?.events?.dragged
    }));

    const { hoveredNodeId } = useEditor((state) => ({
        hoveredNodeId: state.events
    }));
    const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;

    return (
        <div style={{ alignItems: props.align }} className="flex flex-col w-full relative z-50">
            <div
                className="w-fit"
                ref={(ref) => {
                    if (ref instanceof HTMLElement) {
                        connect(drag(ref));
                    }
                }}
            >
                <ActiveBorder active={id == hoveredId} id={id}>
                    <TeamsBasicTimer {...props} />
                </ActiveBorder>
            </div>
        </div>
    );
};

const TimerSettings = () => {
    return (
        <>
            <EditBar config={baseTimerEditbarConfig} />
        </>
    );
};

BaseTimer.craft = {
    props: BaseTimerProps,
    related: {
        settings: TimerSettings
    }
};
