import { EverTeamsTimerElement, TIMER_CHANGE_EVENT, TIMER_ELEMENT_NAME } from './timer-element';

// A page that loads the script twice keeps the first definition: defining a name again throws.
if (!customElements.get(TIMER_ELEMENT_NAME)) {
	customElements.define(TIMER_ELEMENT_NAME, EverTeamsTimerElement);
}

export { EverTeamsTimerElement, TIMER_CHANGE_EVENT, TIMER_ELEMENT_NAME };
