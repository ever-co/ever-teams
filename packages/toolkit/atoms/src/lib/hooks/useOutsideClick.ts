"use client"
import { useCallback, useEffect, useRef } from "react";
import { useCallbackRef } from "./useCallbackRef";

/**
 * Hook `useOutsideClick`:
 *
 * This hook detects clicks that occur outside of a target element. It's commonly used for closing modals, menus, 
 * or other UI elements when the user clicks outside of them. It also allows for managing ignored elements 
 * and dynamically updating the function that handles outside clicks.
 *
 * @template T - The type of the target element. By default, it's an `HTMLElement`.
 *
 * @param {Func<T>} [onClickOuSide] - (optional) A callback function that is executed when the user clicks outside the target element. 
 * This function receives two arguments:
 *  - `el`: The target element being watched for outside clicks.
 *  - `nodeTarget`: The specific DOM node that triggered the outside click event.
 *
 * @returns {Object} - An object containing the following properties and methods:
 *  - `targetEl`: A reference to the target element. Attach this to the element you want to detect outside clicks for.
 *  - `ignoreElementRef`: A function to add a reference to an element that should be ignored when detecting outside clicks.
 *  - `refs`: Additional references to elements that should be ignored when detecting outside clicks.
 *  - `onOutsideClick`: A function to update the handler for outside clicks dynamically.
 *
 * Example usage:
 * 
 * ```tsx
 * const { targetEl, ignoreElementRef, onOutsideClick } = useOutsideClick(() => {
 *   console.log('Clicked outside the target element');
 * });
 *
 * onOutsideClick((el, target) => {
 *   console.log('Element:', el, 'Clicked Target:', target);
 * });
 *
 * return (
 *   <div>
 *     <button ref={ignoreElementRef}>Toggle Menu</button>
 *     <div ref={targetEl}>This is the menu content</div>
 *   </div>
 * );
 * ```
 */
type Func<T = any> = (el: T, nodeTarget: HTMLElement) => void;

export function useOutsideClick<T extends HTMLElement>(onClickOuSide?: Func<T>) {
	// Reference to the target element
	const targetEl = useRef<T>(null);
	
	// Reference to the elements to ignore
	const refs = useRef<Node[]>([]);
  
	// Keeps the onClickOuSide function stable across renders
	const onClickOuSideRef = useCallbackRef(onClickOuSide);
  
	// Adds a 'click' event listener to the body to detect outside clicks
	useEffect(() => {
	  const onBodyClick = (ev: MouseEvent) => {
		if (!targetEl.current) return;
  
		const el = targetEl.current!;
		const tnode = ev.target! as Node;
  
		// Checks if the click is outside the target element and ignored elements
		if (
		  el.contains(tnode) ||
		  refs.current.some((ref) => ref && (ref.isSameNode(tnode) || ref.contains(tnode)))
		) {
		  return;
		}
  
		// Executes the onClickOuSide function if an outside click is detected
		onClickOuSideRef.current && onClickOuSideRef.current(el, ev.target as HTMLElement);
	  };
  
	  document.body.addEventListener('click', onBodyClick);
  
	  // Cleanup the event listener when the component or hook unmounts
	  return () => {
		document.body.removeEventListener('click', onBodyClick);
	  };
	}, [onClickOuSideRef]);
  
	// Allows setting a new handler for outside clicks dynamically
	const onOutsideClick = useCallback(
		(func: Func) => {
			onClickOuSideRef.current = func;
		},
		[onClickOuSideRef]
	);
  
	// Adds elements to the list of elements to ignore when detecting outside clicks
	const ignoreElementRef = useCallback((el: Node) => {
	  refs.current.push(el);
	}, []);
  
	return {
	  targetEl,          // Reference to the target element
	  ignoreElementRef,   // Function to add elements to the ignore list
	  refs,              // List of ignored element references
	  onOutsideClick,     // Function to dynamically update the outside click handler
	};
  }
  